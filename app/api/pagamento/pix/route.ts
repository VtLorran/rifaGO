import { NextResponse } from "next/server";
import { getBloqueioDeAcesso } from "@/lib/plataforma";
import {
  asCredenciaisEstaoConfiguradas,
  criarCobrancaPix,
  ContextoCompra,
} from "@/lib/asaas";
import { VALOR_POR_PONTO } from "@/lib/constantes";
import {
  eventoExiste,
  normalizarCompra,
  pontosJaOcupados,
} from "@/lib/pagamento";

/**
 * Cria a cobrança Pix no Asaas.
 *
 * NÃO grava nada no banco de dados. O contexto da compra (quais pontos,
 * quem comprou) viaja dentro do `metadata` da própria cobrança, e só será
 * materializado em `pontos` / `pagamentos` depois de o Asaas responder
 * RECEIVED ou CONFIRMED.
 */
export async function POST(request: Request) {
  try {
    const bloqueio = await getBloqueioDeAcesso();

    if (bloqueio) {
      return NextResponse.json({ error: bloqueio.mensagem }, { status: 503 });
    }

    if (!asCredenciaisEstaoConfiguradas()) {
      console.error("[pix] Credenciais do Asaas não configuradas.");
      return NextResponse.json(
        { error: "O pagamento por Pix está temporariamente indisponível." },
        { status: 503 },
      );
    }

    const resultado = normalizarCompra(await request.json());

    if (!resultado.ok) {
      return NextResponse.json({ error: resultado.erro }, { status: 400 });
    }

    const compra = resultado.compra;

    if (!(await eventoExiste(compra.hostId))) {
      return NextResponse.json(
        { error: "Evento não encontrado." },
        { status: 404 },
      );
    }

    const ocupados = await pontosJaOcupados(compra.hostId, compra.numerosPontos);

    if (ocupados.length > 0) {
      return NextResponse.json(
        {
          error: `Estes pontos já foram vendidos: ${ocupados.join(", ")}`,
          pontos_ocupados: ocupados,
        },
        { status: 409 },
      );
    }

    const contexto: ContextoCompra = {
      hostId: compra.hostId,
      numerosPontos: compra.numerosPontos,
      nomeComprador: compra.nomeComprador,
      cpfComprador: compra.cpfComprador,
      telefoneComprador: compra.telefoneComprador,
      membroIndicadorId: compra.membroIndicadorId,
    };

    const cobranca = await criarCobrancaPix(
      contexto,
      VALOR_POR_PONTO * compra.numerosPontos.length,
    );

    return NextResponse.json({
      pagamento_id: cobranca.pagamentoId,
      pix_copia_cola: cobranca.pixCopiaECola,
      qr_code_base64: cobranca.qrCodeBase64,
      expiracao: cobranca.expiracao,
      valor: VALOR_POR_PONTO * compra.numerosPontos.length,
      total_pontos: compra.numerosPontos.length,
    });
  } catch (error) {
    console.error("Erro ao gerar a cobrança Pix:", error);
    const mensagem =
      error instanceof Error ? error.message : "Erro interno no servidor.";
    return NextResponse.json({ error: mensagem }, { status: 500 });
  }
}
