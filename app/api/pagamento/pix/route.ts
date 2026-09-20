import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const {
      ponto_id,
      comprador_nome,
      comprador_cpf,
      comprador_telefone,
      valor,
    } = await request.json();

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

    // Validação estrita do CPF antes de chamar o Asaas
    if (!cpfLimpo || cpfLimpo.length !== 11) {
      return NextResponse.json(
        { error: "É necessário informar um CPF válido com 11 dígitos." },
        { status: 400 },
      );
    }

    const asaasUrl = process.env.ASAAS_API_URL?.replace(/\/$/, "");
    const asaasKey = process.env.ASAAS_API_KEY;

    if (!asaasUrl || !asaasKey) {
      return NextResponse.json(
        {
          error:
            "Configuração da API do Asaas ausente nas variáveis de ambiente.",
        },
        { status: 500 },
      );
    }

    // 1. Verifica se o cliente já existe no Asaas pelo CPF para evitar erro de duplicidade
    let customerId = "";

    const responseBusca = await fetch(
      `${asaasUrl}/customers?cpfCnpj=${cpfLimpo}`,
      {
        method: "GET",
        headers: {
          access_token: asaasKey,
        },
      },
    );

    const buscaData = await responseBusca.json();

    if (responseBusca.ok && buscaData.data && buscaData.data.length > 0) {
      // Cliente já cadastrado no Asaas
      customerId = buscaData.data[0].id;
    } else {
      // Cliente não encontrado: cria novo cadastro no Asaas
      const bodyCliente: Record<string, string> = {
        name: comprador_nome,
        cpfCnpj: cpfLimpo,
      };

      if (telefoneLimpo) {
        bodyCliente.phone = telefoneLimpo;
      }

      const responseCliente = await fetch(`${asaasUrl}/customers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          access_token: asaasKey,
        },
        body: JSON.stringify(bodyCliente),
      });

      const clienteData = await responseCliente.json();

      if (!responseCliente.ok) {
        const detalheErro =
          clienteData.errors?.[0]?.description ||
          "Erro ao registrar cliente no Asaas.";
        return NextResponse.json({ error: detalheErro }, { status: 400 });
      }

      customerId = clienteData.id;
    }

    // 2. Cria a cobrança via Pix vinculada ao customerId
    const responseCobranca = await fetch(`${asaasUrl}/payments`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        access_token: asaasKey,
      },
      body: JSON.stringify({
        customer: customerId,
        billingType: "PIX",
        value: Number(valor),
        dueDate: new Date().toISOString().split("T")[0],
        description: `RifaGO - Ponto #${ponto_id}`,
        externalReference: String(ponto_id),
      }),
    });

    const cobrancaData = await responseCobranca.json();

    if (!responseCobranca.ok) {
      const detalheErro =
        cobrancaData.errors?.[0]?.description ||
        "Erro ao criar a cobrança no Asaas.";
      return NextResponse.json({ error: detalheErro }, { status: 400 });
    }

    // 3. Busca o QR Code e o código Pix Copia e Cola
    const responsePixQrCode = await fetch(
      `${asaasUrl}/payments/${cobrancaData.id}/pixQrCode`,
      {
        headers: {
          access_token: asaasKey,
        },
      },
    );

    const pixData = await responsePixQrCode.json();

    if (!responsePixQrCode.ok) {
      const detalheErro =
        pixData.errors?.[0]?.description || "Erro ao buscar QR Code do Pix.";
      return NextResponse.json({ error: detalheErro }, { status: 400 });
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
