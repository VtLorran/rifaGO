import { NextResponse } from "next/server";
import { getEstadoPlataforma } from "@/lib/plataforma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const estado = await getEstadoPlataforma();

    return NextResponse.json({
      pausada: estado.pausada,
      mensagem: estado.mensagem,
      pausado_em: estado.pausado_em,
    });
  } catch (error) {
    console.error("Erro ao consultar o estado da plataforma:", error);
    return NextResponse.json(
      { error: "Erro interno no servidor." },
      { status: 500 },
    );
  }
}
