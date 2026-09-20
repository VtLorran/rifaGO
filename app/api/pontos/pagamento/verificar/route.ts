import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const VALOR_POR_PONTO = 5.0;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { pagamento_id, ponto_id } = body;

    if (!pagamento_id || !ponto_id) {
      return NextResponse.json(
        { error: "ID do pagamento e ID do ponto são obrigatórios." },
        { status: 400 },
      );
    }

    const asaasUrl = process.env.ASAAS_API_URL?.replace(/\/$/, "");
    const asaasKey = process.env.ASAAS_API_KEY;

    if (!asaasUrl || !asaasKey) {
      return NextResponse.json(
        { error: "Configuração da API do Asaas ausente no servidor." },
        { status: 500 },
      );
    }

    // Consulta no Asaas
    const responseAsaas = await fetch(`${asaasUrl}/payments/${pagamento_id}`, {
      method: "GET",
      headers: {
        access_token: asaasKey,
      },
      cache: "no-store",
    });

    const asaasText = await responseAsaas.text();
    let cobrancaData;

    try {
      cobrancaData = JSON.parse(asaasText);
    } catch {
      return NextResponse.json(
        { error: "Resposta inválida retornada pela API do Asaas." },
        { status: 502 },
      );
    }

    if (!responseAsaas.ok) {
      const detalheErro =
        cobrancaData.errors?.[0]?.description ||
        "Erro ao consultar cobrança no Asaas.";
      return NextResponse.json({ error: detalheErro }, { status: 400 });
    }

    const statusAsaas = cobrancaData.status;

    // Se o Asaas atestar que foi pago
    if (statusAsaas === "RECEIVED" || statusAsaas === "CONFIRMED") {
      const ponto = await prisma.ponto.findUnique({
        where: { id: Number(ponto_id) },
        select: { id: true, status: true, host_id: true },
      });

      if (ponto && ponto.status !== "pago") {
        await prisma.$transaction(async (tx) => {
          await tx.ponto.update({
            where: { id: Number(ponto_id) },
            data: { status: "pago" },
          });

          await tx.pagamento.create({
            data: {
              ponto_id: Number(ponto_id),
              valor: VALOR_POR_PONTO,
              forma_pagamento: "pix",
              status: "aprovado",
              processado_em: new Date(),
            },
          });

          await tx.host.update({
            where: { id: ponto.host_id },
            data: {
              valor_arrecadado: {
                increment: VALOR_POR_PONTO,
              },
            },
          });
        });
      }

      return NextResponse.json({ pago: true, status: "pago" });
    }

    return NextResponse.json({
      pago: false,
      status: statusAsaas,
      mensagem: `Status no Asaas: ${statusAsaas}. Aguarde alguns segundos após pagar e clique novamente.`,
    });
  } catch (error: unknown) {
    console.error("Erro na verificação do pagamento:", error);
    const msg = error instanceof Error ? error.message : "Erro interno.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
