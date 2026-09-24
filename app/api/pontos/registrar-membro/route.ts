import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const user = await getAuthUser();

    if (!user || (user.tipo !== "member" && user.tipo !== "host")) {
      return NextResponse.json(
        {
          error:
            "Acesso negado. Apenas membros e hosts podem registrar pontos diretamente.",
        },
        { status: 403 },
      );
    }

    const body = await request.json();
    const {
      host_id,
      numeros_pontos,
      nome_comprador,
      telefone_comprador,
      status_pago,
      membro_indicador_id,
    } = body;

    if (
      !host_id ||
      !numeros_pontos ||
      !Array.isArray(numeros_pontos) ||
      numeros_pontos.length === 0
    ) {
      return NextResponse.json(
        { error: "ID do evento e números dos pontos são obrigatórios." },
        { status: 400 },
      );
    }

    // Valida a faixa de pontos (apenas de 1 a 1200)
    const pontosInvalidos = numeros_pontos.filter((num) => {
      const n = Number(num);
      return isNaN(n) || n < 1 || n > 1200;
    });

    if (pontosInvalidos.length > 0) {
      return NextResponse.json(
        {
          error:
            "Números de ponto inválidos. Escolha apenas valores entre 1 e 1200.",
        },
        { status: 400 },
      );
    }

    // Verifica disponibilidade dos pontos
    const pontosExistentes = await prisma.ponto.findMany({
      where: {
        host_id: Number(host_id),
        numero_ponto: { in: numeros_pontos.map(String) },
      },
    });

    if (pontosExistentes.length > 0) {
      const ocupados = pontosExistentes.map((p) => p.numero_ponto).join(", ");
      return NextResponse.json(
        { error: `Pontos indisponíveis: ${ocupados}` },
        { status: 400 },
      );
    }

    // Define o status do ponto (se foi pago na hora ou fica pendente)
    const statusFinal = status_pago ? "pago" : "pendente";

    // Define a qual membro a venda será vinculada
    let membroVinculadoId: number | null;

    if (user.tipo === "member") {
      membroVinculadoId = user.id;
    } else if (membro_indicador_id) {
      const membroExistente = await prisma.usuario.findUnique({
        where: { id: Number(membro_indicador_id) },
        select: { id: true, tipo: true },
      });

      if (!membroExistente || membroExistente.tipo !== "member") {
        return NextResponse.json(
          { error: "O membro informado não existe." },
          { status: 404 },
        );
      }

      membroVinculadoId = membroExistente.id;
    } else {
      membroVinculadoId = null;
    }

    const novosPontos = await prisma.$transaction(async (tx) => {
      const criados = await Promise.all(
        numeros_pontos.map((numero) =>
          tx.ponto.create({
            data: {
              host_id: Number(host_id),
              numero_ponto: String(numero),
              nome_comprador: nome_comprador || null,
              telefone_comprador: telefone_comprador || null,
              usuario_id: user.id,
              membro_indicador_id: membroVinculadoId,
              status: statusFinal,
              pago_ao_host: false,
            },
          }),
        ),
      );

      // Se registado como pago, incrementa o saldo acumulado (R$ 5.00 por ponto)
      if (statusFinal === "pago") {
        const VALOR_POR_PONTO = 5.0;
        const valorAdicionado = numeros_pontos.length * VALOR_POR_PONTO;

        await tx.host.update({
          where: { id: Number(host_id) },
          data: {
            valor_arrecadado: {
              increment: valorAdicionado,
            },
          },
        });
      }

      return criados;
    });

    return NextResponse.json({
      message: "Pontos registrados pelo membro com sucesso.",
      pontos: novosPontos,
    });
  } catch (error) {
    console.error("Erro ao registrar pontos pelo membro:", error);
    return NextResponse.json(
      { error: "Erro interno no servidor." },
      { status: 500 },
    );
  }
}
