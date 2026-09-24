import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

const VALOR_POR_PONTO = 5.0;

export async function GET() {
  try {
    const user = await getAuthUser();

    if (!user || user.tipo !== "host") {
      return NextResponse.json(
        { error: "Acesso negado. Apenas hosts podem acessar estas vendas." },
        { status: 403 },
      );
    }

    const userHost = await prisma.usuario.findUnique({
      where: { id: user.id },
      select: { hostsGerenciados: { select: { id: true } } },
    });

    const hostIds = userHost?.hostsGerenciados.map((h) => h.id) ?? [];

    if (hostIds.length === 0) {
      return NextResponse.json({
        vendas: [],
        resumo: { total_pendencias: 0, valor_total_pendente: 0 },
      });
    }

    const pontosPendentes = await prisma.ponto.findMany({
      where: {
        host_id: { in: hostIds },
        pago_ao_host: false,
        membro_indicador_id: { not: null },
        usuario_id: { not: null },
        status: { in: ["pendente", "pago"] },
      },
      include: {
        usuario: {
          select: { id: true, nome: true },
        },
      },
      orderBy: { criado_em: "desc" },
    });

    const vendasManuais = pontosPendentes.map((ponto) => ({
      ponto_id: ponto.id,
      numero_ponto: ponto.numero_ponto,
      nome_comprador: ponto.nome_comprador,
      telefone_comprador: ponto.telefone_comprador,
      status: ponto.status,
      valor: VALOR_POR_PONTO,
      criado_em: ponto.criado_em,
      membro: ponto.usuario
        ? { id: ponto.usuario.id, nome: ponto.usuario.nome }
        : null,
      membro_indicador_id: ponto.membro_indicador_id,
    }));

    const totalPendencias = vendasManuais.length;
    const valorTotalPendente = totalPendencias * VALOR_POR_PONTO;

    return NextResponse.json({
      vendas: vendasManuais,
      resumo: {
        total_pendencias: totalPendencias,
        valor_total_pendente: valorTotalPendente,
      },
    });
  } catch (error) {
    console.error("Erro ao buscar vendas manuais:", error);
    return NextResponse.json(
      { error: "Erro interno no servidor." },
      { status: 500 },
    );
  }
}
