import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const user = await getAuthUser();

    if (!user || user.tipo !== "member") {
      return NextResponse.json(
        {
          error:
            "Acesso negado. Apenas membros podem gerar links de compartilhamento.",
        },
        { status: 403 },
      );
    }

    const body = await request.json();
    const { ponto_id } = body;

    if (!ponto_id) {
      return NextResponse.json(
        { error: "O ID do ponto/evento é obrigatório." },
        { status: 400 },
      );
    }

    // Obtém o domínio base da aplicação a partir das variáveis de ambiente
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const urlGerada = `${baseUrl}/?ref=${user.id}`;

    // Cria o registro do link no banco
    const link = await prisma.linkCompartilhamento.create({
      data: {
        membro_id: user.id,
        ponto_id: Number(ponto_id),
        url: urlGerada,
      },
    });

    return NextResponse.json({
      message: "Link de compartilhamento gerado com sucesso.",
      link,
    });
  } catch (error) {
    console.error("Erro ao gerar link:", error);
    return NextResponse.json(
      { error: "Erro interno no servidor." },
      { status: 500 },
    );
  }
}
