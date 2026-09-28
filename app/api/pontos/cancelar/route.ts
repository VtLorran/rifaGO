import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

/**
 * Cancela pontos ainda 'pendentes' (reservas antigas / vendas manuais).
 *
 * Segurança: exige sessão de membro ou host. O comprador anónimo do fluxo
 * Pix NÃO usa mais esta rota — com a nova lógica não existe reserva criada
 * antes do pagamento, e por isso esta rota jamais pode ser alvo de apagar
 * pontos públicos recém-pagos.
 */
export async function POST(request: Request) {
  try {
    const user = await getAuthUser();

    if (!user || (user.tipo !== "member" && user.tipo !== "host")) {
      return NextResponse.json(
        { error: "Acesso negado." },
        { status: 403 },
      );
    }

    const { ponto_ids } = await request.json();

    if (!ponto_ids || !Array.isArray(ponto_ids) || ponto_ids.length === 0) {
      return NextResponse.json(
        { error: "Informe a lista de IDs dos pontos a cancelar." },
        { status: 400 },
      );
    }

    const idsNumericos = ponto_ids.map(Number);

    // Só cancela pontos que estejam com status "pendente"
    const resultado = await prisma.ponto.deleteMany({
      where: {
        id: { in: idsNumericos },
        status: "pendente",
      },
    });

    return NextResponse.json({
      message: `${resultado.count} ponto(s) cancelado(s) com sucesso.`,
      cancelados: resultado.count,
    });
  } catch (error) {
    console.error("Erro ao cancelar pontos:", error);
    return NextResponse.json(
      { error: "Erro interno no servidor." },
      { status: 500 },
    );
  }
}