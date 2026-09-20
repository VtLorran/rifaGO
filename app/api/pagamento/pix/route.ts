import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { ponto_id, comprador_nome, comprador_cpf, comprador_telefone, valor } =
      await request.json();

    if (!ponto_id || !comprador_nome) {
      return NextResponse.json(
        { error: "ID do ponto e nome do comprador são obrigatórios." },
        { status: 400 },
      );
    }

    const cpfLimpo = comprador_cpf ? comprador_cpf.replace(/\D/g, "") : "";
    const telefoneLimpo = comprador_telefone
      ? comprador_telefone.replace(/\D/g, "")
      : undefined;

    // 1. Cria o cliente no Asaas (CPF/CNPJ obrigatório pelo Asaas)
    const bodyCliente: Record<string, string> = {
      name: comprador_nome,
    };

    if (cpfLimpo) {
      bodyCliente.cpfCnpj = cpfLimpo;
    }

    if (telefoneLimpo) {
      bodyCliente.phone = telefoneLimpo;
    }

    const responseCliente = await fetch(
      `${process.env.ASAAS_API_URL}/customers`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          access_token: process.env.ASAAS_API_KEY!,
        },
        body: JSON.stringify(bodyCliente),
      },
    );

    const clienteData = await responseCliente.json();

    if (!responseCliente.ok) {
      const detalheErro =
        clienteData.errors?.[0]?.description ||
        "Erro ao registar cliente no Asaas.";
      throw new Error(detalheErro);
    }

    // 2. Cria a cobrança via Pix
    const responseCobranca = await fetch(
      `${process.env.ASAAS_API_URL}/payments`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          access_token: process.env.ASAAS_API_KEY!,
        },
        body: JSON.stringify({
          customer: clienteData.id,
          billingType: "PIX",
          value: Number(valor),
          dueDate: new Date().toISOString().split("T")[0],
          description: `RifaGO - Ponto #${ponto_id}`,
          externalReference: String(ponto_id),
        }),
      },
    );

    const cobrancaData = await responseCobranca.json();

    if (!responseCobranca.ok) {
      const detalheErro =
        cobrancaData.errors?.[0]?.description ||
        "Erro ao criar a cobrança no Asaas.";
      throw new Error(detalheErro);
    }

    // 3. Busca o QR Code e o código Pix Copia e Cola
    const responsePixQrCode = await fetch(
      `${process.env.ASAAS_API_URL}/payments/${cobrancaData.id}/pixQrCode`,
      {
        headers: {
          access_token: process.env.ASAAS_API_KEY!,
        },
      },
    );

    const pixData = await responsePixQrCode.json();

    if (!responsePixQrCode.ok) {
      const detalheErro =
        pixData.errors?.[0]?.description ||
        "Erro ao buscar QR Code do Pix.";
      throw new Error(detalheErro);
    }

    return NextResponse.json({
      pagamento_id: cobrancaData.id,
      pix_copia_cola: pixData.payload,
      qr_code_base64: pixData.encodedImage,
      expiracao: pixData.expirationDate,
    });
  } catch (error: unknown) {
    const msg =
      error instanceof Error
        ? error.message
        : "Erro interno ao processar o Pix.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
