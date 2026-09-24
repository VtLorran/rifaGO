import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

const VALOR_POR_PONTO = 5.0;

export async function POST(request: Request) {
  try {
    const user = await getAuthUser();

    if (!user || user.tipo !== "host") {
      return NextResponse.json(
        { error: "Acesso negado. Apenas hosts podem cancelar vendas." },
        { status: 403 },
      );
    }

    const body = await request.json();
    const { ponto_ids } = body;

    if (!ponto_ids || !Array.isArray(ponto_ids) || ponto_ids.length === 0) {
      return NextResponse.json(
        { error: "Informe a lista de IDs dos pontos a cancelar." },
        { status: 400 },
      );
    }

    const idsNumericos = ponto_ids.map(Number);

    const pontos = await prisma.ponto.findMany({
      where: { id: { in: idsNumericos } },
    });

    if (pontos.length === 0) {
      return NextResponse.json(
        { error: "Nenhum ponto encontrado." },
        { status: 404 },
      );
    }

    const pontosPagos = pontos.filter((p) => p.status === "pago");
    const valorTotalReverter = pontosPagos.length * VALOR_POR_PONTO;

    await prisma.$transaction(async (tx) => {
      await tx.pagamento.deleteMany({
        where: { ponto_id: { in: idsNumericos } },
      });

      if (pontosPagos.length > 0) {
        const hostId = pontosPagos[0].host_id;
        await tx.host.update({
          where: { id: hostId },
          data: {
            valor_arrecadado: {
              decrement: valorTotalReverter,
            },
          },
        });
      }

      await tx.ponto.deleteMany({
        where: { id: { in: idsNumericos } },
      });
    });

    return NextResponse.json({
      message: `${idsNumericos.length} ponto(s) cancelado(s) e liberado(s) na grade.`,
      cancelados: idsNumericos.length,
    });
  } catch (error) {
    console.error("Erro ao cancelar venda manual:", error);
    return NextResponse.json(
      { error: "Erro ao cancelar e liberar os pontos." },
      { status: 500 },
    );
  }
}
