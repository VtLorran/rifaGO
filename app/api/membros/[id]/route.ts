import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

// PATCH: Host edita um membro cadastrado
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getAuthUser();

    if (!user || user.tipo !== "host") {
      return NextResponse.json(
        { error: "Acesso negado. Apenas hosts podem editar membros." },
        { status: 403 },
      );
    }

    const { id } = await params;
    const membroId = Number(id);

    const membro = await prisma.usuario.findUnique({ where: { id: membroId } });

    if (!membro || membro.tipo !== "member") {
      return NextResponse.json(
        { error: "Membro não encontrado." },
        { status: 404 },
      );
    }

    const body = await request.json();
    const { nome } = body;

    if (!nome || typeof nome !== "string" || !nome.trim()) {
      return NextResponse.json(
        { error: "O nome do membro é obrigatório." },
        { status: 400 },
      );
    }

    const membroAtualizado = await prisma.usuario.update({
      where: { id: membroId },
      data: { nome: nome.trim() },
      select: {
        id: true,
        nome: true,
        codigo_login: true,
        avatar_url: true,
        tipo: true,
      },
    });

    return NextResponse.json({
      message: "Membro atualizado com sucesso.",
      membro: membroAtualizado,
    });
  } catch (error) {
    console.error("Erro ao editar membro:", error);
    return NextResponse.json(
      { error: "Erro interno no servidor." },
      { status: 500 },
    );
  }
}

// DELETE: Host remove um membro cadastrado
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getAuthUser();

    if (!user || user.tipo !== "host") {
      return NextResponse.json(
        { error: "Acesso negado. Apenas hosts podem remover membros." },
        { status: 403 },
      );
    }

    const { id } = await params;
    const membroId = Number(id);

    const membro = await prisma.usuario.findUnique({ where: { id: membroId } });

    if (!membro || membro.tipo !== "member") {
      return NextResponse.json(
        { error: "Membro não encontrado." },
        { status: 404 },
      );
    }

    await prisma.$transaction(async (tx) => {
      // Desvincula as vendas registradas sob este membro
      await tx.ponto.updateMany({
        where: { membro_indicador_id: membroId },
        data: { membro_indicador_id: null },
      });

      // Remove links de divulgação do membro
      await tx.linkCompartilhamento.deleteMany({
        where: { membro_id: membroId },
      });

      await tx.usuario.delete({ where: { id: membroId } });
    });

    return NextResponse.json({
      message: "Membro removido com sucesso.",
    });
  } catch (error) {
    console.error("Erro ao remover membro:", error);
    return NextResponse.json(
      { error: "Erro interno no servidor." },
      { status: 500 },
    );
  }
}