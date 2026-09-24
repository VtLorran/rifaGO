import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'

const TOTAL_PONTOS_EVENTO = 1200
const VALOR_POR_PONTO = 5.0

export async function GET(request: Request) {
  try {
    const user = await getAuthUser()

    if (!user || user.tipo !== 'host') {
      return NextResponse.json(
        { error: 'Acesso negado. Apenas hosts podem acessar este dashboard.' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const host_id = searchParams.get('host_id')

    if (!host_id) {
      return NextResponse.json(
        { error: 'O ID do host/evento é obrigatório.' },
        { status: 400 }
      )
    }

    // 1. Busca os dados do evento
    const host = await prisma.host.findUnique({
      where: { id: Number(host_id) },
    })

    if (!host) {
      return NextResponse.json(
        { error: 'Evento não encontrado.' },
        { status: 404 }
      )
    }

    // 2. Busca todos os pontos do evento
    const todosPontos = await prisma.ponto.findMany({
      where: { host_id: Number(host_id) },
      include: {
        usuario: {
          select: { id: true, nome: true, avatar_url: true },
        },
      },
    })

    // 3. Busca todos os membros cadastrados
    const membros = await prisma.usuario.findMany({
      where: { tipo: 'member' },
      select: { id: true, nome: true, avatar_url: true, codigo_login: true, senha_hash: true },
    })

    // Mapeia o desempenho e pontuação de cada membro
    const rankingMembros = membros.map((membro) => {
      const pontosDoMembro = todosPontos.filter(
        (p) => p.membro_indicador_id === membro.id
      )
      const quantidade = pontosDoMembro.length
      const totalArrecadado = quantidade * VALOR_POR_PONTO

      return {
        membro_id: membro.id,
        nome: membro.nome,
        avatar_url: membro.avatar_url,
        codigo_login: membro.codigo_login,
        tem_senha: !!membro.senha_hash,
        pontos_vendidos: quantidade,
        valor_arrecadado: totalArrecadado,
        numeros_pontos: pontosDoMembro.map((p) => p.numero_ponto),
      }
    })

    // Vendas realizadas sem link de membro (venda direta do Host)
    const vendasDiretasHost = todosPontos.filter(
      (p) => p.membro_indicador_id === null
    )

    const totalPontosVendidos = todosPontos.length
    const totalArrecadadoGeral = totalPontosVendidos * VALOR_POR_PONTO

    return NextResponse.json({
      evento: {
        id: host.id,
        nome_evento: host.nome_evento,
        limite_total_pontos: TOTAL_PONTOS_EVENTO,
      },
      resumo_geral: {
        total_pontos_vendidos: totalPontosVendidos,
        pontos_restantes: TOTAL_PONTOS_EVENTO - totalPontosVendidos,
        valor_total_arrecadado: totalArrecadadoGeral,
        porcentagem_concluida: Number(
          ((totalPontosVendidos / TOTAL_PONTOS_EVENTO) * 100).toFixed(2)
        ),
      },
      vendas_diretas_host: {
        quantidade: vendasDiretasHost.length,
        valor: vendasDiretasHost.length * VALOR_POR_PONTO,
      },
      membros: rankingMembros,
    })
  } catch (error) {
    console.error('Erro no dashboard do host:', error)
    return NextResponse.json(
      { error: 'Erro interno no servidor.' },
      { status: 500 }
    )
  }
}