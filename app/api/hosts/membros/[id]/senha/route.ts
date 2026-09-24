import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import bcrypt from "bcryptjs";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getAuthUser();

    if (!user || user.tipo !== "host") {
      return NextResponse.json(
        { error: "Acesso negado. Apenas hosts podem alterar senhas de membros." },
        { status: 403 },
      );
    }

    const { id } = await params;
    const membroId = Number(id);

    const membro = await prisma.usuario.findUnique({
      where: { id: membroId },
      select: { id: true, tipo: true, senha_hash: true },
    });

    if (!membro || membro.tipo !== "member") {
      return NextResponse.json(
        { error: "Membro não encontrado." },
        { status: 404 },
      );
    }

    const body = await request.json();
    const { nova_senha } = body;

    if (!nova_senha || typeof nova_senha !== "string" || nova_senha.length < 4) {
      return NextResponse.json(
        { error: "A nova senha deve ter pelo menos 4 caracteres." },
        { status: 400 },
      );
    }

    const senha_hash = await bcrypt.hash(nova_senha, 10);

    await prisma.usuario.update({
      where: { id: membroId },
      data: { senha_hash },
    });

    return NextResponse.json({
      message: "Senha do membro atualizada com sucesso.",
    });
  } catch (error) {
    console.error("Erro ao alterar senha do membro:", error);
    return NextResponse.json(
      { error: "Erro interno no servidor." },
      { status: 500 },
    );
  }
}
