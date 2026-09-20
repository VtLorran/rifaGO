import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const host_id = searchParams.get("host_id");

    if (!host_id) {
      return NextResponse.json(
        { error: "O ID do host/evento é obrigatório." },
        { status: 400 },
      );
    }

    // Busca os pontos já registrados no banco para este evento
    const pontosOcupados = await prisma.ponto.findMany({
      where: {
        host_id: Number(host_id),
      },
      select: {
        id: true,
        numero_ponto: true,
        status: true,
        nome_comprador: true,
        telefone_comprador: true,
        membro_indicador_id: true,
      },
      orderBy: {
        numero_ponto: "asc",
      },
    });

    return NextResponse.json({
      total_registrados: pontosOcupados.length,
      pontos: pontosOcupados,
    });
  } catch (error) {
    console.error("Erro ao buscar pontos disponíveis:", error);
    return NextResponse.json(
      { error: "Erro interno no servidor." },
      { status: 500 },
    );
  }
}
