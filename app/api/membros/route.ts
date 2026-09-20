import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

const PREFIXO_CODIGO = "2024118ISINF";

// POST: Host cadastra novos membros informando os últimos 4 dígitos do código
export async function POST(request: Request) {
  try {
    const user = await getAuthUser();

    if (!user || user.tipo !== "host") {
      return NextResponse.json(
        { error: "Acesso negado. Apenas hosts podem cadastrar membros." },
        { status: 403 },
      );
    }

    const body = await request.json();
    const { nome, digitos, avatar_url } = body;

    // Valida se os 4 dígitos foram enviados
    if (!nome || !digitos) {
      return NextResponse.json(
        { error: "O nome e os 4 dígitos do código são obrigatórios." },
        { status: 400 },
      );
    }

    // Normaliza para string e remove espaços
    const digitosLimpos = String(digitos).trim();

    // Valida se são exatamente 4 dígitos numéricos
    if (!/^\d{4}$/.test(digitosLimpos)) {
      return NextResponse.json(
        { error: "O código deve conter exatamente 4 dígitos numéricos." },
        { status: 400 },
      );
    }

    // Monta o código completo
    const codigo_login = `${PREFIXO_CODIGO}${digitosLimpos}`;

    // Verifica se esse código final já está cadastrado
    const codigoExistente = await prisma.usuario.findUnique({
      where: { codigo_login },
    });

    if (codigoExistente) {
      return NextResponse.json(
        {
          error: `O código de login ${codigo_login} já está em uso por outro membro.`,
        },
        { status: 400 },
      );
    }

    // Cria o membro no banco
    const membro = await prisma.usuario.create({
      data: {
        nome,
        codigo_login,
        avatar_url,
        tipo: "member",
      },
      select: {
        id: true,
        nome: true,
        codigo_login: true,
        avatar_url: true,
        tipo: true,
        criado_em: true,
      },
    });

    return NextResponse.json({
      message: "Membro criado com sucesso.",
      membro,
    });
  } catch (error) {
    console.error("Erro ao criar membro:", error);
    return NextResponse.json(
      { error: "Erro interno no servidor." },
      { status: 500 },
    );
  }
}

// GET: Lista todos os membros
export async function GET() {
  try {
    const user = await getAuthUser();

    if (!user) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const membros = await prisma.usuario.findMany({
      where: {
        tipo: "member",
      },
      select: {
        id: true,
        nome: true,
        avatar_url: true,
        codigo_login: true,
        criado_em: true,
      },
      orderBy: {
        criado_em: "desc",
      },
    });

    return NextResponse.json({ membros });
  } catch (error) {
    console.error("Erro ao listar membros:", error);
    return NextResponse.json(
      { error: "Erro interno no servidor." },
      { status: 500 },
    );
  }
}
