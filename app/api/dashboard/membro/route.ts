import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

const VALOR_POR_PONTO = 5.0;

export async function GET() {
  try {
    const user = await getAuthUser();

    if (!user || user.tipo !== "member") {
      return NextResponse.json(
        {
          error: "Acesso negado. Apenas membros podem acessar este dashboard.",
        },
        { status: 403 },
      );
    }

    // Busca o membro logado para obter o código de login
    const membro = await prisma.usuario.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        nome: true,
        codigo_login: true,
        avatar_url: true,
      },
    });

    if (!membro) {
      return NextResponse.json(
        { error: "Membro não encontrado." },
        { status: 404 },
      );
    }

    // Busca os pontos vendidos vinculados a este membro
    const pontos = await prisma.ponto.findMany({
      where: {
        membro_indicador_id: user.id,
      },
      select: {
        id: true,
        numero_ponto: true,
        status: true,
        nome_comprador: true,
        telefone_comprador: true,
        criado_em: true,
      },
      orderBy: {
        criado_em: "desc",
      },
    });

    const totalPontosVendidos = pontos.length;
    const valorTotalArrecadado = totalPontosVendidos * VALOR_POR_PONTO;

    // Busca o host (evento) ativo para o grid de pontos
    const host = await prisma.host.findFirst({
      orderBy: { id: "asc" },
      select: { id: true, nome_evento: true },
    });

    if (!host) {
      return NextResponse.json(
        { error: "Nenhum evento ativo encontrado." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      host_id: host.id,
      nome_evento: host.nome_evento,
      membro: {
        id: membro.id,
        nome: membro.nome,
        codigo_login: membro.codigo_login,
        avatar_url: membro.avatar_url,
      },
      resumo: {
        total_pontos_vendidos: totalPontosVendidos,
        valor_total_arrecadado: valorTotalArrecadado,
        preco_por_ponto: VALOR_POR_PONTO,
      },
      pontos: pontos.map((p) => ({
        id: p.id,
        numero_ponto: Number(p.numero_ponto),
        status: p.status,
        comprador_nome: p.nome_comprador,
        comprador_telefone: p.telefone_comprador,
        criado_em: p.criado_em,
      })),
    });
  } catch (error) {
    console.error("Erro no dashboard do membro:", error);
    return NextResponse.json(
      { error: "Erro interno no servidor." },
      { status: 500 },
    );
  }
}