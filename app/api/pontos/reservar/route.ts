import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

const NUMERO_MINIMO = 1;
const NUMERO_MAXIMO = 1200;
const HOST_ID_PADRAO = 1;

export async function POST(request: Request) {
  try {
    const user = await getAuthUser();

    if (!user || (user.tipo !== "member" && user.tipo !== "host")) {
      return NextResponse.json(
        {
          error: "Acesso negado. Apenas membros e hosts podem reservar pontos.",
        },
        { status: 403 },
      );
    }

    const body = await request.json();
    const {
      numero_ponto,
      numeros_pontos,
      comprador_nome,
      comprador_telefone,
      membro_id,
      host_id,
    } = body;

    if (!comprador_nome || !comprador_telefone) {
      return NextResponse.json(
        { error: "Nome e telefone do comprador são obrigatórios." },
        { status: 400 },
      );
    }

    // Aceita um único `numero_ponto` OU uma lista `numeros_pontos`
    const listaNumeros = Array.isArray(numeros_pontos)
      ? numeros_pontos
      : numero_ponto !== undefined
        ? [numero_ponto]
        : [];

    if (listaNumeros.length === 0) {
      return NextResponse.json(
        { error: "Informe ao menos um número de ponto para reservar." },
        { status: 400 },
      );
    }

    // Converte para números e remove duplicados
    const numeros = [
      ...new Set(
        listaNumeros.map((num) => Number(num)).filter((n) => !isNaN(n)),
      ),
    ];

    if (numeros.length === 0) {
      return NextResponse.json(
        { error: "Os números de ponto informados são inválidos." },
        { status: 400 },
      );
    }

    const numerosInvalidos = numeros.filter(
      (n) => n < NUMERO_MINIMO || n > NUMERO_MAXIMO,
    );

    if (numerosInvalidos.length > 0) {
      return NextResponse.json(
        {
          error: `Números de ponto inválidos. Escolha apenas valores entre ${NUMERO_MINIMO} e ${NUMERO_MAXIMO}.`,
        },
        { status: 400 },
      );
    }

    // Define a qual membro a venda será vinculada
    let membroVinculadoId: number;

    if (user.tipo === "member") {
      membroVinculadoId = user.id;
    } else {
      if (!membro_id) {
        return NextResponse.json(
          {
            error:
              "Informe o ID do membro para o qual a venda deve ser vinculada.",
          },
          { status: 400 },
        );
      }

      membroVinculadoId = Number(membro_id);

      const membroExistente = await prisma.usuario.findUnique({
        where: { id: membroVinculadoId },
        select: { id: true, tipo: true },
      });

      if (!membroExistente || membroExistente.tipo !== "member") {
        return NextResponse.json(
          { error: "O membro informado não existe." },
          { status: 404 },
        );
      }
    }

    // Define o evento (host) padrão caso não informado
    const hostVinculadoId = Number(host_id ?? HOST_ID_PADRAO);

    const hostExistente = await prisma.host.findUnique({
      where: { id: hostVinculadoId },
      select: { id: true },
    });

    if (!hostExistente) {
      return NextResponse.json(
        { error: "O evento/host informado não existe." },
        { status: 404 },
      );
    }

    // Verifica se algum dos números já foi reservado/pago para este evento
    const pontosOcupados = await prisma.ponto.findMany({
      where: {
        host_id: hostVinculadoId,
        numero_ponto: { in: numeros.map(String) },
      },
      select: { numero_ponto: true },
    });

    if (pontosOcupados.length > 0) {
      const ocupados = pontosOcupados.map((p) => p.numero_ponto).join(", ");
      return NextResponse.json(
        { error: `Pontos já reservados ou vendidos: ${ocupados}` },
        { status: 400 },
      );
    }

    // Reserva os pontos vinculados ao membro
    const novosPontos = await prisma.$transaction(
      numeros.map((numero) =>
        prisma.ponto.create({
          data: {
            host_id: hostVinculadoId,
            numero_ponto: String(numero),
            nome_comprador: comprador_nome,
            telefone_comprador: comprador_telefone,
            usuario_id: user.id,
            membro_indicador_id: membroVinculadoId,
            status: "pendente",
          },
        }),
      ),
    );

    return NextResponse.json(
      {
        message: "Pontos reservados com sucesso. Aguardando pagamento.",
        total_pontos: novosPontos.length,
        pontos: novosPontos.map((p) => ({
          id: p.id,
          numero_ponto: Number(p.numero_ponto),
          status: p.status,
          comprador_nome: p.nome_comprador,
          comprador_telefone: p.telefone_comprador,
          criado_em: p.criado_em,
        })),
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Erro ao reservar ponto:", error);
    return NextResponse.json(
      { error: "Erro interno no servidor." },
      { status: 500 },
    );
  }
}