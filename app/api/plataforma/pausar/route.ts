import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { definirPausaPlataforma, getEstadoPlataforma } from "@/lib/plataforma";

export async function GET() {
  try {
    const user = await getAuthUser();

    if (!user || user.tipo !== "host") {
      return NextResponse.json(
        { error: "Acesso negado. Apenas hosts podem gerir a plataforma." },
        { status: 403 },
      );
    }

    const estado = await getEstadoPlataforma();

    return NextResponse.json(estado);
  } catch (error) {
    console.error("Erro ao consultar o estado da plataforma:", error);
    return NextResponse.json(
      { error: "Erro interno no servidor." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuthUser();

    if (!user || user.tipo !== "host") {
      return NextResponse.json(
        { error: "Acesso negado. Apenas hosts podem gerir a plataforma." },
        { status: 403 },
      );
    }

    const body = await request
      .json()
      .catch(() => ({}) as Record<string, unknown>);

    if (typeof body.pausada !== "boolean") {
      return NextResponse.json(
        { error: "Informe o campo booleano 'pausada'." },
        { status: 400 },
      );
    }

    const estado = await definirPausaPlataforma(
      body.pausada,
      user.id,
      typeof body.mensagem === "string" ? body.mensagem : undefined,
    );

    console.log(
      `[plataforma] ${user.nome} (host #${user.id}) ${
        estado.pausada ? "PAUSOU" : "REATIVEU"
      } a plataforma.`,
    );

    return NextResponse.json(estado);
  } catch (error) {
    console.error("Erro ao alterar o estado da plataforma:", error);
    return NextResponse.json(
      { error: "Erro interno no servidor." },
      { status: 500 },
    );
  }
}
