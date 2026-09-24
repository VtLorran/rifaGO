import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      host_id,
      numeros_pontos,
      nome_comprador,
      telefone_comprador,
      membro_indicador_id,
    } = body;

    // 1. Validações de presença
    if (
      !host_id ||
      !numeros_pontos ||
      !Array.isArray(numeros_pontos) ||
      numeros_pontos.length === 0
    ) {
      return NextResponse.json(
        {
          error: "ID do evento e ao menos um número de ponto são obrigatórios.",
        },
        { status: 400 },
      );
    }

    if (!nome_comprador || !telefone_comprador) {
      return NextResponse.json(
        { error: "Nome e telefone do comprador são obrigatórios." },
        { status: 400 },
      );
    }

    // 2. Validação da faixa de pontos (apenas números de 1 a 1200)
    const pontosInvalidos = numeros_pontos.filter((num) => {
      const n = Number(num);
      return isNaN(n) || n < 1 || n > 1200;
    });

    if (pontosInvalidos.length > 0) {
      return NextResponse.json(
        {
          error:
            "Números de ponto inválidos detectados. Escolha apenas pontos entre 1 e 1200.",
        },
        { status: 400 },
      );
    }

    // 3. Verifica se algum dos números já está ocupado no banco para este host
    const pontosExistentes = await prisma.ponto.findMany({
      where: {
        host_id: Number(host_id),
        numero_ponto: { in: numeros_pontos.map(String) },
      },
    });

    if (pontosExistentes.length > 0) {
      const ocupados = pontosExistentes.map((p) => p.numero_ponto).join(", ");
      return NextResponse.json(
        {
          error: `Os seguintes pontos já foram reservados ou pagos: ${ocupados}`,
        },
        { status: 400 },
      );
    }

    // 4. Cria todos os pontos com status 'pendente'
    const resultado = await prisma.$transaction(async (tx) => {
      const novosPontos = await Promise.all(
        numeros_pontos.map((numero) =>
          tx.ponto.create({
            data: {
              host_id: Number(host_id),
              numero_ponto: String(numero),
              nome_comprador,
              telefone_comprador,
              membro_indicador_id: membro_indicador_id
                ? Number(membro_indicador_id)
                : null,
              status: "pendente",
              pago_ao_host: false,
            },
          }),
        ),
      );

      return novosPontos;
    });

    return NextResponse.json({
      message: "Pontos reservados com sucesso. Aguardando pagamento.",
      total_pontos: resultado.length,
      pontos: resultado,
    });
  } catch (error) {
    console.error("Erro na compra pública de pontos:", error);
    return NextResponse.json(
      { error: "Erro interno no servidor." },
      { status: 500 },
    );
  }
}
