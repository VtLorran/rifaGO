import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export async function PATCH(request: Request) {
  try {
    const user = await getAuthUser();

    if (!user || user.tipo !== "host") {
      return NextResponse.json(
        { error: "Acesso negado. Apenas hosts podem dar baixa em vendas." },
        { status: 403 },
      );
    }

    const body = await request.json();
    const { ponto_ids } = body;

    if (!ponto_ids || !Array.isArray(ponto_ids) || ponto_ids.length === 0) {
      return NextResponse.json(
        { error: "Informe a lista de IDs dos pontos para dar baixa." },
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

    const pontosInvalidos = pontos.filter(
      (p) => p.pago_ao_host || p.membro_indicador_id === null,
    );

    if (pontosInvalidos.length > 0) {
      return NextResponse.json(
        {
          error: `${pontosInvalidos.length} ponto(s) já foram baixados ou não pertencem a vendas de membros.`,
        },
        { status: 400 },
      );
    }

    await prisma.ponto.updateMany({
      where: { id: { in: idsNumericos } },
      data: { pago_ao_host: true },
    });

    return NextResponse.json({
      message: `${idsNumericos.length} venda(s) baixada(s) com sucesso.`,
      atualizados: idsNumericos.length,
    });
  } catch (error) {
    console.error("Erro ao dar baixa nas vendas:", error);
    return NextResponse.json(
      { error: "Erro interno no servidor." },
      { status: 500 },
    );
  }
}
