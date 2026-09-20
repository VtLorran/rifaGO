import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const { ponto_ids } = await request.json();

    if (!ponto_ids || !Array.isArray(ponto_ids) || ponto_ids.length === 0) {
      return NextResponse.json(
        { error: "Informe a lista de IDs dos pontos a cancelar." },
        { status: 400 },
      );
    }

    const idsNumericos = ponto_ids.map(Number);

    // Só cancela pontos que estejam com status "pendente"
    const resultado = await prisma.ponto.deleteMany({
      where: {
        id: { in: idsNumericos },
        status: "pendente",
      },
    });

    return NextResponse.json({
      message: `${resultado.count} ponto(s) cancelado(s) com sucesso.`,
      cancelados: resultado.count,
    });
  } catch (error) {
    console.error("Erro ao cancelar pontos:", error);
    return NextResponse.json(
      { error: "Erro interno no servidor." },
      { status: 500 },
    );
  }
}
