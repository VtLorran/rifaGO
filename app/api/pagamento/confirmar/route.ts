import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { ponto_ids, forma_pagamento, valor_total } = body;

    if (!ponto_ids || !Array.isArray(ponto_ids) || ponto_ids.length === 0) {
      return NextResponse.json(
        { error: "Informe a lista de IDs dos pontos a serem confirmados." },
        { status: 400 },
      );
    }

    const idsNumericos = ponto_ids.map(Number);

    await prisma.$transaction(async (tx) => {
      // 1. Atualiza status dos pontos para 'pago'
      await tx.ponto.updateMany({
        where: { id: { in: idsNumericos } },
        data: { status: "pago" },
      });

      // 2. Procura o primeiro ponto para obter o host_id
      const pontoExemplo = await tx.ponto.findUnique({
        where: { id: idsNumericos[0] },
      });

      if (pontoExemplo) {
        const valorCalculado = valor_total || idsNumericos.length * 5.0;
        const valorPorPonto = valorCalculado / idsNumericos.length;

        // 3. Regista o pagamento individual para cada ponto
        for (const pontoId of idsNumericos) {
          await tx.pagamento.create({
            data: {
              ponto_id: pontoId,
              valor: valorPorPonto,
              forma_pagamento: forma_pagamento || "pix",
              status: "aprovado",
              processado_em: new Date(),
            },
          });
        }

        // 4. Incrementa o valor acumulado no evento/host
        await tx.host.update({
          where: { id: pontoExemplo.host_id },
          data: {
            valor_arrecadado: {
              increment: valorCalculado,
            },
          },
        });
      }
    });

    return NextResponse.json({
      message:
        "Pagamento confirmado e pontos atualizados para pago com sucesso.",
    });
  } catch (error) {
    console.error("Erro ao confirmar pagamento:", error);
    return NextResponse.json(
      { error: "Erro interno no servidor." },
      { status: 500 },
    );
  }
}
