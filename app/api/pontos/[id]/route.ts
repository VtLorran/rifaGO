import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

const VALOR_POR_PONTO = 5.0;

// PATCH: Host edita um ponto já registrado (comprador, telefone ou quem indicou)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getAuthUser();

    if (!user || user.tipo !== "host") {
      return NextResponse.json(
        { error: "Acesso negado. Apenas hosts podem editar pontos." },
        { status: 403 },
      );
    }

    const { id } = await params;
    const pontoId = Number(id);

    const ponto = await prisma.ponto.findUnique({ where: { id: pontoId } });

    if (!ponto) {
      return NextResponse.json({ error: "Ponto não encontrado." }, { status: 404 });
    }

    const body = await request.json();
    const { nome_comprador, telefone_comprador } = body;

    const data: {
      nome_comprador?: string | null;
      telefone_comprador?: string | null;
      membro_indicador_id?: number | null;
    } = {};

    if (typeof nome_comprador === "string") {
      data.nome_comprador = nome_comprador.trim() || null;
    }

    if (typeof telefone_comprador === "string") {
      data.telefone_comprador = telefone_comprador.trim() || null;
    }

    if ("membro_indicador_id" in body) {
      const indicador = body.membro_indicador_id;
      if (indicador === null || indicador === undefined || indicador === "") {
        data.membro_indicador_id = null;
      } else {
        const membro = await prisma.usuario.findUnique({
          where: { id: Number(indicador) },
          select: { id: true, tipo: true },
        });

        if (!membro || membro.tipo !== "member") {
          return NextResponse.json(
            { error: "O membro informado como indicador não existe." },
            { status: 404 },
          );
        }

        data.membro_indicador_id = membro.id;
      }
    }

    const pontoAtualizado = await prisma.ponto.update({
      where: { id: pontoId },
      data,
      select: {
        id: true,
        numero_ponto: true,
        status: true,
        nome_comprador: true,
        telefone_comprador: true,
        membro_indicador_id: true,
      },
    });

    return NextResponse.json({
      message: "Ponto atualizado com sucesso.",
      ponto: pontoAtualizado,
    });
  } catch (error) {
    console.error("Erro ao atualizar ponto:", error);
    return NextResponse.json(
      { error: "Erro interno no servidor." },
      { status: 500 },
    );
  }
}

// DELETE: Host remove um ponto registrado (e reverte o valor arrecadado, se pago)
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getAuthUser();

    if (!user || user.tipo !== "host") {
      return NextResponse.json(
        { error: "Acesso negado. Apenas hosts podem remover pontos." },
        { status: 403 },
      );
    }

    const { id } = await params;
    const pontoId = Number(id);

    const ponto = await prisma.ponto.findUnique({ where: { id: pontoId } });

    if (!ponto) {
      return NextResponse.json({ error: "Ponto não encontrado." }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      // Remove pagamentos vinculados (evita erros de chave estrangeira)
      await tx.pagamento.deleteMany({ where: { ponto_id: pontoId } });

      // Se o ponto estava pago, reverte o valor arrecadado do host
      if (ponto.status === "pago") {
        await tx.host.update({
          where: { id: ponto.host_id },
          data: {
            valor_arrecadado: { decrement: VALOR_POR_PONTO },
          },
        });
      }

      await tx.ponto.delete({ where: { id: pontoId } });
    });

    return NextResponse.json({
      message: "Ponto removido com sucesso.",
    });
  } catch (error) {
    console.error("Erro ao remover ponto:", error);
    return NextResponse.json(
      { error: "Erro interno no servidor." },
      { status: 500 },
    );
  }
}