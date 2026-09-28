import { NextResponse } from "next/server";
import { getBloqueioDeAcesso } from "@/lib/plataforma";
import {
  eventoExiste,
  normalizarCompra,
  pontosJaOcupados,
} from "@/lib/pagamento";

/**
 * Valida a seleção do comprador.
 *
 * Este endpoint NÃO grava nada. Um ponto só passa a existir depois que o
 * Asaas confirmar o pagamento. A occupation real acontece em
 * `lib/pagamento.ts -> confirmarPagamentoPix`, dentro de uma transação.
 */
export async function POST(request: Request) {
  try {
    const bloqueio = await getBloqueioDeAcesso();

    if (bloqueio) {
      return NextResponse.json({ error: bloqueio.mensagem }, { status: 503 });
    }

    const resultado = normalizarCompra(await request.json());

    if (!resultado.ok) {
      return NextResponse.json({ error: resultado.erro }, { status: 400 });
    }

    const { hostId, numerosPontos } = resultado.compra;

    const evento = await eventoExiste(hostId);
    if (!evento) {
      return NextResponse.json(
        { error: "Evento não encontrado." },
        { status: 404 },
      );
    }

    const ocupados = await pontosJaOcupados(hostId, numerosPontos);

    if (ocupados.length > 0) {
      return NextResponse.json(
        {
          error: `Estes pontos já foram vendidos: ${ocupados.join(", ")}`,
          pontos_ocupados: ocupados,
        },
        { status: 409 },
      );
    }

    return NextResponse.json({
      valido: true,
      total_pontos: numerosPontos.length,
      numeros_pontos: numerosPontos,
    });
  } catch (error) {
    console.error("Erro ao validar a compra pública:", error);
    return NextResponse.json(
      { error: "Erro interno no servidor." },
      { status: 500 },
    );
  }
}
