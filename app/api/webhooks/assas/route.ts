import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const VALOR_POR_PONTO = 5.0;

export async function POST(request: Request) {
  try {
    // Validação opcional de segurança pelo header do Webhook do Asaas
    const webhookTokenHeader = request.headers.get("asaas-access-token");
    if (
      process.env.ASAAS_WEBHOOK_TOKEN &&
      webhookTokenHeader !== process.env.ASAAS_WEBHOOK_TOKEN
    ) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await request.json();

    // Disparado quando o Pix é pago e confirmado no banco do Asaas
    if (
      body.event === "PAYMENT_RECEIVED" ||
      body.event === "PAYMENT_CONFIRMED"
    ) {
      const pontoId = body.payment?.externalReference;

      if (pontoId) {
        const ponto = await prisma.ponto.findUnique({
          where: { id: Number(pontoId) },
          select: { id: true, status: true, host_id: true },
        });

        if (!ponto) {
          console.error(`❌ Ponto #${pontoId} não encontrado.`);
          return NextResponse.json({ received: true });
        }

        // Só processa se ainda não estiver pago (evita duplicidade de transações)
        if (ponto.status !== "pago") {
          await prisma.$transaction(async (tx) => {
            await tx.ponto.update({
              where: { id: Number(pontoId) },
              data: { status: "pago", pago_ao_host: true },
            });

            // Registra o pagamento
            await tx.pagamento.create({
              data: {
                ponto_id: Number(pontoId),
                valor: VALOR_POR_PONTO,
                forma_pagamento: "pix",
                status: "aprovado",
                processado_em: new Date(),
              },
            });

            // Incrementa o valor arrecadado no host/evento
            await tx.host.update({
              where: { id: ponto.host_id },
              data: {
                valor_arrecadado: {
                  increment: VALOR_POR_PONTO,
                },
              },
            });
          });

          console.log(
            `✅ Pagamento confirmado via Asaas! Ponto #${pontoId} atualizado para PAGO.`,
          );
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("❌ Erro ao processar o Webhook do Asaas:", error);
    return NextResponse.json(
      { error: "Erro ao processar webhook" },
      { status: 500 },
    );
  }
}
