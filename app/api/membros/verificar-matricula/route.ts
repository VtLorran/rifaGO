import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const PREFIXO_CODIGO = "2024118ISINF";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { digitos } = body;

    if (!digitos || !/^\d{4}$/.test(String(digitos).trim())) {
      return NextResponse.json(
        { error: "Envie exatamente 4 dígitos numéricos." },
        { status: 400 },
      );
    }

    const codigo_login = `${PREFIXO_CODIGO}${String(digitos).trim()}`;

    const usuario = await prisma.usuario.findUnique({
      where: { codigo_login },
      select: {
        id: true,
        nome: true,
        tipo: true,
        senha_hash: true,
      },
    });

    if (!usuario) {
      return NextResponse.json(
        { error: "Matrícula não encontrada." },
        { status: 404 },
      );
    }

    if (usuario.tipo !== "member") {
      return NextResponse.json(
        { error: "Esta matrícula não pertence a um membro." },
        { status: 400 },
      );
    }

    const jaPossuiSenha = !!usuario.senha_hash;

    return NextResponse.json({
      membro_id: usuario.id,
      nome: usuario.nome,
      ja_possui_senha: jaPossuiSenha,
    });
  } catch (error) {
    console.error("Erro ao verificar matrícula:", error);
    return NextResponse.json(
      { error: "Erro interno no servidor." },
      { status: 500 },
    );
  }
}
