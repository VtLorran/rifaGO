import { prisma } from "@/lib/prisma";
import { getAuthUser } from "@/lib/auth";
import { MENSAGEM_PADRAO_MANUTENCAO } from "@/lib/mensagens";
import type { UserPayload } from "@/lib/jwt";

/** A configuração da plataforma é um registo único (id = 1). */
const ID_CONFIGURACAO = 1;

export interface EstadoPlataforma {
  pausada: boolean;
  mensagem: string;
  pausado_por: number | null;
  pausado_em: Date | null;
}

/** Membros e hosts são os únicos perfis que continuam a operar durante a pausa. */
export function ehUsuarioInterno(user: UserPayload | null): boolean {
  return user?.tipo === "member" || user?.tipo === "host";
}

/**
 * Lê o estado de manutenção da plataforma.
 * Cria o registo inicial caso ainda não exista na base de dados.
 *
 * Falha de forma permissiva: se a tabela ainda não existir (migration não
 * aplicada), devolve o estado por omissão em vez de derrubar a página inicial.
 */
export async function getEstadoPlataforma(): Promise<EstadoPlataforma> {
  try {
    const configuracao = await prisma.configuracaoPlataforma.upsert({
      where: { id: ID_CONFIGURACAO },
      create: {
        id: ID_CONFIGURACAO,
        pausada: false,
        mensagem: MENSAGEM_PADRAO_MANUTENCAO,
      },
      update: {},
      select: {
        pausada: true,
        mensagem: true,
        pausado_por: true,
        pausado_em: true,
      },
    });

    return configuracao;
  } catch (error) {
    console.error(
      "Erro ao ler o estado da plataforma. A plataforma será considerada ativa:",
      error,
    );

    return {
      pausada: false,
      mensagem: MENSAGEM_PADRAO_MANUTENCAO,
      pausado_por: null,
      pausado_em: null,
    };
  }
}

/** Liga ou desliga a pausa para toda a plataforma. */
export async function definirPausaPlataforma(
  pausada: boolean,
  hostId: number,
  mensagem?: string,
): Promise<EstadoPlataforma> {
  const mensagemLimpa = mensagem?.trim();

  const configuracao = await prisma.configuracaoPlataforma.upsert({
    where: { id: ID_CONFIGURACAO },
    create: {
      id: ID_CONFIGURACAO,
      pausada,
      mensagem: mensagemLimpa || MENSAGEM_PADRAO_MANUTENCAO,
      pausado_por: pausada ? hostId : null,
      pausado_em: pausada ? new Date() : null,
    },
    update: {
      pausada,
      ...(mensagemLimpa ? { mensagem: mensagemLimpa } : {}),
      pausado_por: pausada ? hostId : null,
      pausado_em: pausada ? new Date() : null,
    },
    select: {
      pausada: true,
      mensagem: true,
      pausado_por: true,
      pausado_em: true,
    },
  });

  return configuracao;
}

/**
 * Devolve o estado de manutenção quando o utilizador atual não tem permissão
 * para operar (cliente final ou visitante sem sessão). Caso contrário null.
 * Usado tanto no servidor (telas) como nos route handlers das APIs.
 */
export async function getBloqueioDeAcesso(): Promise<EstadoPlataforma | null> {
  const estado = await getEstadoPlataforma();

  if (!estado.pausada) return null;

  const user = await getAuthUser();
  if (ehUsuarioInterno(user)) return null;

  return estado;
}
