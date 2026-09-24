import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { membro_id, senha, confirmar_senha } = body;

    if (!membro_id || !senha || !confirmar_senha) {
      return NextResponse.json(
        { error: "Todos os campos são obrigatórios." },
        { status: 400 },
      );
    }

    if (senha !== confirmar_senha) {
      return NextResponse.json(
        { error: "As senhas não coincidem." },
        { status: 400 },
      );
    }

    if (senha.length < 4) {
      return NextResponse.json(
        { error: "A senha deve ter pelo menos 4 caracteres." },
        { status: 400 },
      );
    }

    const usuario = await prisma.usuario.findUnique({
      where: { id: Number(membro_id) },
      select: { id: true, tipo: true, senha_hash: true },
    });

    if (!usuario || usuario.tipo !== "member") {
      return NextResponse.json(
        { error: "Membro não encontrado." },
        { status: 404 },
      );
    }

    if (usuario.senha_hash) {
      return NextResponse.json(
        {
          error: "Esta conta já possui senha cadastrada. Faça login.",
          redirecionar_login: true,
        },
        { status: 400 },
      );
    }

    const senha_hash = await bcrypt.hash(senha, 10);

    await prisma.usuario.update({
      where: { id: Number(membro_id) },
      data: { senha_hash },
    });

    return NextResponse.json({
      message: "Senha definida com sucesso. Faça login para acessar.",
    });
  } catch (error) {
    console.error("Erro ao definir senha:", error);
    return NextResponse.json(
      { error: "Erro interno no servidor." },
      { status: 500 },
    );
  }
}
