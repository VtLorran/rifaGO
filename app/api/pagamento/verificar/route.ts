import { NextResponse } from "next/server";
import {
  asCredenciaisEstaoConfiguradas,
  consultarPagamento,
  contextoDoMetadata,
  pagamentoFoiRecebido,
  pontoIdLegado,
} from "@/lib/asaas";
import {
  confirmarPagamentoPix,
  confirmarPontoExistente,
} from "@/lib/pagamento";

export const dynamic = "force-dynamic";

/**
 * Polling do comprador. Consulta o status da cobrança no Asaas e, se ele
 * disser que o dinheiro entrou, materializa a compra.
 *
 * NÃO é bloqueado pela pausa da plataforma: um pagamento já iniciado tem de
 * poder ser confirmado mesmo durante a manutenção.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;

    const pagamentoId = String(body.pagamento_id ?? "").trim();

    if (!pagamentoId) {
      return NextResponse.json(
        { error: "ID do pagamento é obrigatório." },
        { status: 400 },
      );
    }

    if (!asCredenciaisEstaoConfiguradas()) {
      return NextResponse.json(
        { error: "Configuração da API do Asaas ausente no servidor." },
        { status: 500 },
      );
    }

    const cobranca = await consultarPagamento(pagamentoId);

    if (!pagamentoFoiRecebido(cobranca.status)) {
      return NextResponse.json({
        pago: false,
        status: cobranca.status,
        mensagem: `Status no Asaas: ${cobranca.status}. Se você já pagou no seu banco, aguarde alguns segundos.`,
      });
    }

    // O metadata da própria cobrança tem precedência: é o registo
    // autoritativo do que foi comprado, criado no servidor.
    const contexto = await resolveContexto(cobranca, body);

    if (!contexto) {
      return NextResponse.json(
        { error: "Não foi possível identificar a compra desta cobrança." },
        { status: 400 },
      );
    }

    if (contexto.legado) {
      if (contexto.pontoId) {
        await confirmarPontoExistente(contexto.pontoId, pagamentoId);
      }
      return NextResponse.json({ pago: true, status: "pago", pontos: [] });
    }

    const resultado = await confirmarPagamentoPix({
      pagamentoAsaasId: pagamentoId,
      hostId: contexto.hostId,
      numerosPontos: contexto.numerosPontos,
      nomeComprador: contexto.nomeComprador,
      cpfComprador: contexto.cpfComprador,
      telefoneComprador: contexto.telefoneComprador,
      membroIndicadorId: contexto.membroIndicadorId,
      valorRecebido: cobranca.valor,
    });

    if (!resultado.ok) {
      console.error(
        `[verificar] Cobrança ${pagamentoId} paga mas não confirmada: ${resultado.motivo}`,
      );
      return NextResponse.json(
        {
          pago: false,
          status: cobranca.status,
          erro_pagamento: resultado.motivo,
          pontos: resultado.numeros,
        },
        { status: 409 },
      );
    }

    return NextResponse.json({
      pago: true,
      status: "pago",
      pontos: resultado.pontos,
    });
  } catch (error) {
    console.error("Erro na verificação do pagamento:", error);
    const mensagem =
      error instanceof Error ? error.message : "Erro interno servidor.";
    return NextResponse.json({ error: mensagem }, { status: 500 });
  }
}

type ContextoResolvido =
  | { legado: false; hostId: number; numerosPontos: string[]; nomeComprador: string; cpfComprador: string; telefoneComprador: string; membroIndicadorId: number | null }
  | { legado: true; pontoId: number | null };

/**
 * Resolve o que foi comprado a partir do metadata da cobrança. Quando o
 * metadata não existe (cobrança gerada antes desta mudança), assume o
 * formato antigo, em que o `externalReference` era o id de um ponto já
 * criado com status 'pendente'.
 */
async function resolveContexto(
  cobranca: Awaited<ReturnType<typeof consultarPagamento>>,
  body: Record<string, unknown>,
): Promise<ContextoResolvido | null> {
  const doMetadata = contextoDoMetadata(cobranca.metadata);
  if (doMetadata) {
    return { legado: false, ...doMetadata };
  }

  const legado = pontoIdLegado(cobranca.externalReference);
  if (legado !== null) {
    return { legado: true, pontoId: legado };
  }

  // Último recurso: o próprio navegador, que ainda tem o contexto em memória
  const numeros = Array.isArray(body.numeros_pontos) ? body.numeros_pontos : [];
  const hostId = Number(body.host_id);

  if (
    numeros.length > 0 &&
    Number.isInteger(hostId) &&
    hostId > 0 &&
    String(body.cpf_comprador ?? "").replace(/\D/g, "").length === 11
  ) {
    return {
      legado: false,
      hostId,
      numerosPontos: numeros.map(String),
      nomeComprador: String(body.nome_comprador ?? "Cliente RifaGO"),
      cpfComprador: String(body.cpf_comprador).replace(/\D/g, ""),
      telefoneComprador: String(body.telefone_comprador ?? ""),
      membroIndicadorId: null,
    };
  }

  return null;
}
