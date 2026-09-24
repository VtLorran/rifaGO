import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateToken } from "@/lib/jwt";
import bcrypt from "bcryptjs";

const PREFIXO_CODIGO = "2024118ISINF";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { digitos, senha } = body;

    if (!digitos || !/^\d{4}$/.test(String(digitos).trim())) {
      return NextResponse.json(
        { error: "Envie exatamente 4 dígitos numéricos." },
        { status: 400 },
      );
    }

    if (!senha) {
      return NextResponse.json(
        { error: "A senha é obrigatória." },
        { status: 400 },
      );
    }

    const codigo_login = `${PREFIXO_CODIGO}${String(digitos).trim()}`;

    const usuario = await prisma.usuario.findUnique({
      where: { codigo_login },
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

    if (!usuario.senha_hash) {
      return NextResponse.json(
        {
          error: "Você ainda não definiu sua senha. Acesse o primeiro acesso.",
          primeiro_acesso: true,
        },
        { status: 400 },
      );
    }

    const senhaValida = await bcrypt.compare(senha, usuario.senha_hash);

    if (!senhaValida) {
      return NextResponse.json(
        { error: "Senha incorreta." },
        { status: 401 },
      );
    }

    const token = await generateToken({
      id: usuario.id,
      tipo: usuario.tipo,
      nome: usuario.nome,
    });

    const response = NextResponse.json({
      message: "Login realizado com sucesso",
      user: {
        id: usuario.id,
        nome: usuario.nome,
        tipo: usuario.tipo,
        avatar_url: usuario.avatar_url,
      },
    });

    response.cookies.set({
      name: "auth_token",
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24,
    });

    return response;
  } catch (error) {
    console.error("Erro no login do membro:", error);
    return NextResponse.json(
      { error: "Erro interno no servidor." },
      { status: 500 },
    );
  }
}
