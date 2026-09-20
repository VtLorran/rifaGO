import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "O ID do ponto é obrigatório." },
        { status: 400 },
      );
    }

    const ponto = await prisma.ponto.findUnique({
      where: { id: Number(id) },
      select: {
        id: true,
        status: true,
        numero_ponto: true,
      },
    });

    if (!ponto) {
      return NextResponse.json(
        { error: "Ponto não encontrado." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      id: ponto.id,
      status: ponto.status,
      numero_ponto: ponto.numero_ponto,
    });
  } catch (error) {
    console.error("Erro ao consultar status do ponto:", error);
    return NextResponse.json(
      { error: "Erro interno no servidor." },
      { status: 500 },
    );
  }
}
