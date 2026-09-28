import { NextResponse } from "next/server";
import {
  asCredenciaisEstaoConfiguradas,
  consultarPagamento,
  contextoDoMetadata,
  pontoIdLegado,
} from "@/lib/asaas";
import {
  confirmarPagamentoPix,
  confirmarPontoExistente,
} from "@/lib/pagamento";

/**
 * Rede de segurança para quando o comprador fecha o navegador antes de o
 * polling concluir. Usa exatamente a mesma função de confirmação do polling,
 * que já é idempotente — por isso os dois caminhos podem chegar em
 * simultâneo sem duplicar pontos nem o valor arrecadado.
 */
export async function POST(request: Request) {
  try {
    const tokenHeader = request.headers.get("asaas-access-token");
    if (
      process.env.ASAAS_WEBHOOK_TOKEN &&
      tokenHeader !== process.env.ASAAS_WEBHOOK_TOKEN
    ) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await request.json();

    if (
      body.event !== "PAYMENT_RECEIVED" &&
      body.event !== "PAYMENT_CONFIRMED"
    ) {
      return NextResponse.json({ received: true });
    }

    const pagamentoId: string | undefined = body.payment?.id;

    if (!pagamentoId) {
      return NextResponse.json({ received: true });
    }

    // O webhook não traz metadata de forma fiável em todos os casos.
    // Quando falta, reabrimos a cobrança para ler o contexto autoritativo.
    let cobranca = {
      status: "RECEIVED" as string,
      valor: 0,
      metadata: (body.payment?.metadata ?? null) as Record<
        string,
        unknown
      > | null,
      externalReference: (body.payment?.externalReference ?? null) as string | null,
    };

    if (!asCredenciaisEstaoConfiguradas()) {
      console.error("[webhook] Credenciais do Asaas não configuradas.");
      return NextResponse.json({ received: true });
    }

    try {
      cobranca = await consultarPagamento(pagamentoId);
    } catch (erro) {
      console.error(
        `[webhook] Falha ao consultar a cobrança ${pagamentoId}:`,
        erro,
      );
      return NextResponse.json({ received: true });
    }

    const contexto = contextoDoMetadata(cobranca.metadata);

    if (contexto) {
      const resultado = await confirmarPagamentoPix({
        pagamentoAsaasId: pagamentoId,
        hostId: contexto.hostId,
        numerosPontos: contexto.numerosPontos,
        nomeComprador: contexto.nomeComprador,
        cpfComprador: contexto.cpfComprador,
        telefoneComprador: contexto.telefoneComprador,
        membroIndicadorId: contexto.membroIndicadorId,
        valorRecebido: cobranca.valor || undefined,
      });

      if (!resultado.ok) {
        console.error(
          `[webhook] Cobrança ${pagamentoId} paga e não confirmada (${resultado.motivo}): ${resultado.numeros.join(",")}. Requer estorno manual.`,
        );
      }

      return NextResponse.json({ received: true });
    }

    // Cobrança gerada antes desta mudança: o externalReference era o id de
    // um ponto já criado com status 'pendente'.
    const legado = pontoIdLegado(cobranca.externalReference);

    if (legado !== null) {
      await confirmarPontoExistente(legado, pagamentoId);
    } else {
      console.error(
        `[webhook] Cobrança ${pagamentoId} (R$ ${cobranca.valor}) recebida sem contexto reconhecível. Reconciliação manual necessária no Asaas.`,
      );
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Erro ao processar o Webhook do Asaas:", error);
    return NextResponse.json(
      { error: "Erro ao processar webhook" },
      { status: 500 },
    );
  }
}
