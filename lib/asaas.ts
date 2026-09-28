const ASAAS_BASE_URL = process.env.ASAAS_API_URL?.replace(/\/$/, "");
const ASAAS_API_KEY = process.env.ASAAS_API_KEY;

/** O Asaas limita o tamanho de cada valor dentro de `metadata`. */
export const LIMITE_METADATA = 450;

/** Teto defensivo ao expands faixas vindas de um metadata corrompido. */
const TAMANHO_MAXIMO_FAIXA = 5000;

/**
 * Contexto completo da compra. Viaja dentro da cobrança do Asaas para que
 * o webhook consiga saber exatamente quais pontos confirmar, sem precisar
 * de nenhuma escrita no banco antes do pagamento.
 */
export interface ContextoCompra {
  hostId: number;
  numerosPontos: string[];
  nomeComprador: string;
  cpfComprador: string;
  telefoneComprador: string;
  membroIndicadorId: number | null;
}

export function asCredenciaisEstaoConfiguradas(): boolean {
  return Boolean(ASAAS_BASE_URL && ASAAS_API_KEY);
}

function authHeaders(): Record<string, string> {
  return {
    "Content-Type": "application/json",
    access_token: ASAAS_API_KEY ?? "",
  };
}

async function erroDoAsaas(response: Response, fallback: string): Promise<string> {
  try {
    const corpo = await response.json();
    return (
      corpo?.errors?.[0]?.description ||
      corpo?.message ||
      fallback
    );
  } catch {
    return fallback;
  }
}

/**
 * Comprime a lista de pontos em faixas: [1,2,3,9,11,12] -> "1-3,9,11-12".
 * Sem isto, uma compra de 1200 pontos geraria uma string de vários KB, acima
 * do limite de `metadata` do Asaas.
 */
export function codificarPontos(numeros: string[] | number[]): string {
  const ordenados = [
    ...new Set(
      numeros
        .map((n) => Number(n))
        .filter((n) => Number.isInteger(n) && n > 0),
    ),
  ].sort((a, b) => a - b);

  if (ordenados.length === 0) return "";

  const faixas: string[] = [];
  let inicio = ordenados[0];
  let anterior = ordenados[0];

  for (let i = 1; i <= ordenados.length; i++) {
    const atual = ordenados[i];

    if (atual === anterior + 1) {
      anterior = atual;
      continue;
    }

    faixas.push(inicio === anterior ? String(inicio) : `${inicio}-${anterior}`);
    inicio = atual;
    anterior = atual;
  }

  return faixas.join(",");
}

export function decodificarPontos(codificado: string): string[] {
  if (!codificado) return [];

  const saida: string[] = [];

  for (const parte of codificado.split(",")) {
    const trecho = parte.trim();
    if (!trecho) continue;

    if (trecho.includes("-")) {
      const [a, b] = trecho.split("-").map(Number);
      if (!Number.isInteger(a) || !Number.isInteger(b)) continue;

      const inicio = Math.min(a, b);
      const fim = Math.max(a, b);

      // Guarda de segurança contra metadata corrompido ou hostil
      if (fim - inicio > TAMANHO_MAXIMO_FAIXA) continue;

      for (let n = inicio; n <= fim; n++) saida.push(String(n));
    } else {
      const n = Number(trecho);
      if (Number.isInteger(n) && n > 0) saida.push(String(n));
    }
  }

  return [...new Set(saida)];
}

export function montarMetadata(contexto: ContextoCompra): Record<string, string> {
  const pontos = codificarPontos(contexto.numerosPontos);

  if (!pontos) {
    throw new Error("Selecione ao menos um ponto válido para concluir a compra.");
  }

  if (pontos.length > LIMITE_METADATA) {
    throw new Error(
      "A seleção de pontos é demasiado grande para gerar a cobrança. Divida a compra em partes menores.",
    );
  }

  return {
    rifago: "1",
    host: String(contexto.hostId),
    pontos,
    nome: contexto.nomeComprador,
    cpf: contexto.cpfComprador,
    tel: contexto.telefoneComprador,
    membro: contexto.membroIndicadorId
      ? String(contexto.membroIndicadorId)
      : "",
  };
}

/** Reconstrói o contexto da compra a partir do metadata devolvido pelo Asaas. */
export function contextoDoMetadata(
  metadata: Record<string, unknown> | null | undefined,
): ContextoCompra | null {
  if (!metadata || metadata.rifago !== "1") return null;

  const hostId = Number(metadata.host);
  const cpf = String(metadata.cpf ?? "");
  const pontos = decodificarPontos(String(metadata.pontos ?? ""));
  const membro = Number(metadata.membro);

  if (!Number.isInteger(hostId) || hostId <= 0) return null;
  if (!pontos.length) return null;

  return {
    hostId,
    numerosPontos: pontos,
    nomeComprador: String(metadata.nome ?? "Cliente RifaGO"),
    cpfComprador: cpf,
    telefoneComprador: String(metadata.tel ?? ""),
    membroIndicadorId: Number.isInteger(membro) && membro > 0 ? membro : null,
  };
}

export interface CobrancaPix {
  pagamentoId: string;
  pixCopiaECola: string;
  qrCodeBase64: string;
  expiracao: string | null;
}

/** Localiza o cliente pelo CPF ou cria um novo cadastro no Asaas. */
export async function garantirCustomer(
  nome: string,
  cpf: string,
  telefone?: string,
): Promise<string> {
  const respostaBusca = await fetch(
    `${ASAAS_BASE_URL}/customers?cpfCnpj=${cpf}`,
    { method: "GET", headers: authHeaders(), cache: "no-store" },
  );

  if (respostaBusca.ok) {
    const busca = await respostaBusca.json();
    if (busca?.data?.length) return busca.data[0].id;
  }

  const corpo: Record<string, string> = { name: nome, cpfCnpj: cpf };
  if (telefone) corpo.phone = telefone;

  const respostaCriacao = await fetch(`${ASAAS_BASE_URL}/customers`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(corpo),
  });

  if (!respostaCriacao.ok) {
    throw new Error(
      await erroDoAsaas(respostaCriacao, "Erro ao registrar cliente no Asaas."),
    );
  }

  const cliente = await respostaCriacao.json();
  return cliente.id;
}

/**
 * Cria a cobrança Pix no Asaas. Não toca no banco de dados: o contexto da
 * compra viaja no `metadata` e só será materializado depois de o Asaas
 * confirmar o recebimento.
 */
export async function criarCobrancaPix(
  contexto: ContextoCompra,
  valor: number,
): Promise<CobrancaPix> {
  const customerId = await garantirCustomer(
    contexto.nomeComprador,
    contexto.cpfComprador,
    contexto.telefoneComprador,
  );

  const metadata = montarMetadata(contexto);

  const resposta = await fetch(`${ASAAS_BASE_URL}/payments`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      customer: customerId,
      billingType: "PIX",
      value: valor,
      dueDate: new Date().toISOString().split("T")[0],
      description: `RifaGO - ${contexto.numerosPontos.length} ponto(s)`,
      externalReference: `RGO:${Date.now()}`,
      metadata,
    }),
  });

  if (!resposta.ok) {
    throw new Error(
      await erroDoAsaas(resposta, "Erro ao criar a cobrança no Asaas."),
    );
  }

  const cobranca = await resposta.json();

  const respostaPix = await fetch(
    `${ASAAS_BASE_URL}/payments/${cobranca.id}/pixQrCode`,
    { headers: authHeaders(), cache: "no-store" },
  );

  if (!respostaPix.ok) {
    throw new Error(
      await erroDoAsaas(respostaPix, "Erro ao gerar o QR Code do Pix."),
    );
  }

  const pix = await respostaPix.json();

  return {
    pagamentoId: cobranca.id,
    pixCopiaECola: pix.payload,
    qrCodeBase64: pix.encodedImage,
    expiracao: pix.expirationDate ?? null,
  };
}

export interface PagamentoAsaas {
  status: string;
  valor: number;
  metadata: Record<string, unknown> | null;
  externalReference: string | null;
}

export async function consultarPagamento(
  pagamentoId: string,
): Promise<PagamentoAsaas> {
  const resposta = await fetch(`${ASAAS_BASE_URL}/payments/${pagamentoId}`, {
    method: "GET",
    headers: authHeaders(),
    cache: "no-store",
  });

  if (!resposta.ok) {
    throw new Error(
      await erroDoAsaas(resposta, "Erro ao consultar a cobrança no Asaas."),
    );
  }

  const cobranca = await resposta.json();

  return {
    status: cobranca.status,
    valor: Number(cobranca.value ?? 0),
    metadata: cobranca.metadata ?? null,
    externalReference: cobranca.externalReference ?? null,
  };
}

export function pagamentoFoiRecebido(status: string): boolean {
  return status === "RECEIVED" || status === "CONFIRMED";
}

/**
 * Detecta o formato antigo de cobrança, em que `externalReference` era o id
 * de um ponto previamente criado com status 'pendente'. As cobranças novas
 * usam `RGO:<timestamp>`, por isso um valor puramente numérico é legado.
 */
export function pontoIdLegado(externalReference: string | null): number | null {
  if (!externalReference) return null;

  const n = Number(externalReference);
  if (!Number.isInteger(n) || n <= 0) return null;

  return n;
}
