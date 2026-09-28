import { prisma } from "@/lib/prisma";
import {
  VALOR_POR_PONTO,
  NUMERO_MINIMO_PONTO,
  NUMERO_MAXIMO_PONTO,
} from "@/lib/constantes";

export interface CompraSolicitada {
  hostId: number;
  numerosPontos: string[];
  nomeComprador: string;
  cpfComprador: string;
  telefoneComprador: string;
  membroIndicadorId: number | null;
}

function texto(valor: unknown): string {
  return typeof valor === "string" ? valor.trim() : "";
}

/**
 * Valida e normaliza o corpo de uma compra pública. Não toca no banco.
 */
export function normalizarCompra(
  body: unknown,
): { ok: true; compra: CompraSolicitada } | { ok: false; erro: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, erro: "Dados da compra inválidos." };
  }

  const dados = body as Record<string, unknown>;

  const hostId = Number(dados.host_id);
  if (!Number.isInteger(hostId) || hostId <= 0) {
    return { ok: false, erro: "ID do evento inválido." };
  }

  const brutos = Array.isArray(dados.numeros_pontos) ? dados.numeros_pontos : [];
  if (brutos.length === 0) {
    return { ok: false, erro: "Escolha ao menos um ponto." };
  }

  const numeros = [
    ...new Set(
      brutos
        .map((n) => String(n).trim())
        .filter((n) => /^\d+$/.test(n))
        .map(String)
        .map(Number),
    ),
  ].sort((a, b) => a - b);

  if (numeros.length !== brutos.length) {
    return { ok: false, erro: "Seleção de pontos inválida." };
  }

  const foraDaFaixa = numeros.filter(
    (n) => n < NUMERO_MINIMO_PONTO || n > NUMERO_MAXIMO_PONTO,
  );

  if (foraDaFaixa.length > 0) {
    return {
      ok: false,
      erro: `Escolha apenas pontos entre ${NUMERO_MINIMO_PONTO} e ${NUMERO_MAXIMO_PONTO}.`,
    };
  }

  const nomeComprador = texto(dados.nome_comprador);
  const telefoneComprador = texto(dados.telefone_comprador);
  const cpfComprador = texto(dados.cpf_comprador).replace(/\D/g, "");

  if (nomeComprador.length < 3) {
    return { ok: false, erro: "Informe o nome completo." };
  }

  if (telefoneComprador.replace(/\D/g, "").length < 10) {
    return { ok: false, erro: "Informe um telefone válido com DDD." };
  }

  if (cpfComprador.length !== 11) {
    return { ok: false, erro: "Informe um CPF válido." };
  }

  const membro = Number(dados.membro_indicador_id);

  return {
    ok: true,
    compra: {
      hostId,
      numerosPontos: numeros.map(String),
      nomeComprador,
      cpfComprador,
      telefoneComprador,
      membroIndicadorId:
        Number.isInteger(membro) && membro > 0 ? membro : null,
    },
  };
}

/** Confirma que o evento existe antes de qualquer operação de compra. */
export async function eventoExiste(hostId: number): Promise<boolean> {
  const host = await prisma.host.findUnique({
    where: { id: hostId },
    select: { id: true },
  });

  return host !== null;
}

/**
 * Checagem de disponibilidade. SOMENTE LEITURA: um ponto é considerado
 * livre quando ainda não existe registo para ele neste evento.
 */
export async function pontosJaOcupados(
  hostId: number,
  numerosPontos: string[],
): Promise<string[]> {
  const existentes = await prisma.ponto.findMany({
    where: { host_id: hostId, numero_ponto: { in: numerosPontos } },
    select: { numero_ponto: true },
  });

  return existentes.map((p) => p.numero_ponto);
}


export interface DadosConfirmacao {
  pagamentoAsaasId: string;
  hostId: number;
  numerosPontos: string[];
  nomeComprador: string;
  cpfComprador: string | null;
  telefoneComprador: string | null;
  membroIndicadorId: number | null;
  /** Valor efetivamente recebido no Asaas, para conferir contra a compra. */
  valorRecebido?: number;
}

export type ResultadoConfirmacao =
  | { ok: true; jaConfirmado: boolean; pontos: string[] }
  | { ok: false; motivo: "conflito" | "valor_divergente"; numeros: string[] };

function codigoPrisma(error: unknown): string | null {
  if (error && typeof error === "object" && "code" in error) {
    return String((error as { code: unknown }).code);
  }
  return null;
}

/**
 * Materializa uma compra CONFIRMADA pelo Asaas.
 *
 * Só é chamada depois de o Asaas responder RECEIVED/CONFIRMED. É a única
 * função autorizada a criar pontos para compras públicas.
 *
 * Idempotência em duas camadas, porque o polling do frontend e o webhook
 * podem disparar ao mesmo tempo:
 *  1. `pagamentos.pagamento_asaas_id` marca a cobrança já processada.
 *  2. `pontos @@unique(host_id, numero_ponto)` faz o INSERT perder a corrida
 *     se outro cliente tiver comprado o mesmo número no intervalo.
 */
export async function confirmarPagamentoPix(
  dados: DadosConfirmacao,
): Promise<ResultadoConfirmacao> {
  const numeros = [
    ...new Set(dados.numerosPontos.map((n) => String(n).trim()).filter(Boolean)),
  ];

  if (numeros.length === 0) {
    return { ok: false, motivo: "conflito", numeros: [] };
  }

  const valorEsperado = VALOR_POR_PONTO * numeros.length;

  if (
    typeof dados.valorRecebido === "number" &&
    Math.abs(dados.valorRecebido - valorEsperado) > 0.01
  ) {
    console.error(
      `[pagamento] Valor divergente na cobrança ${dados.pagamentoAsaasId}: recebido ${dados.valorRecebido}, esperado ${valorEsperado}`,
    );
    return { ok: false, motivo: "valor_divergente", numeros };
  }

  try {
    return await prisma.$transaction(async (tx) => {
      const jaProcessada = await tx.pagamento.findFirst({
        where: { pagamento_asaas_id: dados.pagamentoAsaasId },
        select: { id: true },
      });

      if (jaProcessada) {
        return { ok: true, jaConfirmado: true, pontos: numeros };
      }

      const ocupados = await tx.ponto.findMany({
        where: { host_id: dados.hostId, numero_ponto: { in: numeros } },
        select: { numero_ponto: true },
      });

      if (ocupados.length > 0) {
        return {
          ok: false,
          motivo: "conflito",
          numeros: ocupados.map((p) => p.numero_ponto),
        };
      }

      for (const numero of numeros) {
        const ponto = await tx.ponto.create({
          data: {
            host_id: dados.hostId,
            numero_ponto: numero,
            status: "pago",
            nome_comprador: dados.nomeComprador,
            cpf_comprador: dados.cpfComprador,
            telefone_comprador: dados.telefoneComprador,
            membro_indicador_id: dados.membroIndicadorId,
            pago_ao_host: false,
          },
        });

        await tx.pagamento.create({
          data: {
            ponto_id: ponto.id,
            valor: VALOR_POR_PONTO,
            forma_pagamento: "pix",
            status: "aprovado",
            processado_em: new Date(),
            pagamento_asaas_id: dados.pagamentoAsaasId,
          },
        });
      }

      await tx.host.update({
        where: { id: dados.hostId },
        data: { valor_arrecadado: { increment: valorEsperado } },
      });

      return { ok: true, jaConfirmado: false, pontos: numeros };
    });
  } catch (error) {
    // P2002: outro cliente comprou algum destes números enquanto esta
    // transação corria. O rollback garante que nada foi gravado.
    if (codigoPrisma(error) === "P2002") {
      console.error(
        `[pagamento] Conflito de ponto na cobrança ${dados.pagamentoAsaasId}: ${numeros.join(",")}`,
      );
      return { ok: false, motivo: "conflito", numeros };
    }
    throw error;
  }
}

/**
 * Confirmação das cobranças criadas ANTES desta mudança, que gravavam um
 * ponto com status 'pendente' e usavam esse id como `externalReference`.
 * Essencial para que os pontos já pendentes continuem a poder ser pagos.
 */
export async function confirmarPontoExistente(
  pontoId: number,
  pagamentoAsaasId: string,
): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    const ponto = await tx.ponto.findUnique({ where: { id: pontoId } });

    if (!ponto) return false;
    if (ponto.status === "pago") return true;

    await tx.ponto.update({
      where: { id: pontoId },
      data: { status: "pago" },
    });

    const jaLancado = await tx.pagamento.findFirst({
      where: { ponto_id: pontoId, pagamento_asaas_id: pagamentoAsaasId },
      select: { id: true },
    });

    if (!jaLancado) {
      await tx.pagamento.create({
        data: {
          ponto_id: pontoId,
          valor: VALOR_POR_PONTO,
          forma_pagamento: "pix",
          status: "aprovado",
          processado_em: new Date(),
          pagamento_asaas_id: pagamentoAsaasId,
        },
      });

      await tx.host.update({
        where: { id: ponto.host_id },
        data: { valor_arrecadado: { increment: VALOR_POR_PONTO } },
      });
    }

    return true;
  });
}
