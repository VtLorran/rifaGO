import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateToken } from "@/lib/jwt";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { codigo_login, senha } = body;

    if (!codigo_login) {
      return NextResponse.json(
        { error: "Código de login é obrigatório." },
        { status: 400 },
      );
    }

    // Busca o usuário pelo código de login
    const usuario = await prisma.usuario.findUnique({
      where: { codigo_login },
    });

    if (!usuario) {
      return NextResponse.json(
        { error: "Credenciais inválidas." },
        { status: 401 },
      );
    }

    // SE FOR HOST: Exige e valida a senha forte com bcrypt
    if (usuario.tipo === "host") {
      if (!senha) {
        return NextResponse.json(
          {
            error: "Senha é obrigatória para acesso de Host.",
            redefinirSenha: false,
            exigeSenha: true,
          },
          { status: 401 },
        );
      }

      if (!usuario.senha_hash) {
        return NextResponse.json(
          { error: "Conta de Host sem senha configurada no banco." },
          { status: 500 },
        );
      }

      const senhaValida = await bcrypt.compare(senha, usuario.senha_hash);

      if (!senhaValida) {
        return NextResponse.json(
          { error: "Senha incorreta." },
          { status: 401 },
        );
      }
    }

    // Gerar token e cookie HTTP-only (igual ao fluxo anterior)
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
    console.error("Erro no login:", error);
    return NextResponse.json(
      { error: "Erro interno no servidor." },
      { status: 500 },
    );
  }
}
