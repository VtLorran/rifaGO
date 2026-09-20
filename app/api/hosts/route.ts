import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    const user = await getAuthUser()

    if (!user || user.tipo !== 'host') {
      return NextResponse.json(
        { error: 'Acesso negado. Apenas hosts podem criar eventos.' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { nome_evento } = body

    if (!nome_evento) {
      return NextResponse.json(
        { error: 'O nome do evento é obrigatório.' },
        { status: 400 }
      )
    }

    const host = await prisma.host.create({
      data: {
        usuario_id: user.id,
        nome_evento,
        valor_arrecadado: 0,
      },
    })

    return NextResponse.json({
      message: 'Evento do host criado com sucesso',
      host,
    })
  } catch (error) {
    console.error('Erro ao criar host:', error)
    return NextResponse.json(
      { error: 'Erro interno no servidor.' },
      { status: 500 }
    )
  }
}