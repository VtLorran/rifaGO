import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Disparado quando o Pix é pago e confirmado no banco
    if (body.event === "PAYMENT_RECEIVED") {
      const pontoId = body.payment?.externalReference;

      if (pontoId) {
        // Atualiza o estado do ponto na base de dados para "pago"
        await prisma.ponto.update({
          where: { id: Number(pontoId) },
          data: {
            status: "pago",
          },
        });

        console.log(
          `✅ Pagamento confirmado via Asaas! Ponto #${pontoId} atualizado para PAGO.`,
        );
      }
    }

    // Responde com sucesso ao Asaas
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("❌ Erro ao processar o Webhook do Asaas:", error);
    return NextResponse.json(
      { error: "Erro ao processar webhook" },
      { status: 500 },
    );
  }
}
