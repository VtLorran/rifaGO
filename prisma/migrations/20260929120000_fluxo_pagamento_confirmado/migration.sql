-- =====================================================================
-- Fluxo de pagamento Pix: nada é gravado em `pontos` antes de o Asaas
-- confirmar o recebimento.
--
-- ATENÇÃO: esta migration é ADITIVA. Não remove, altera status nem
-- sobrescreve NENHUM ponto já existente. Os pontos que já foram vendidos
-- permanecem exatamente como estão.
-- =====================================================================

-- AlterTable: guardar o CPF do comprador (o formulário já o recolhia, mas era descartado)
ALTER TABLE "pontos" ADD COLUMN "cpf_comprador" VARCHAR(11);

-- AlterTable: chave de idempotência e rastreabilidade da cobrança Asaas
ALTER TABLE "pagamentos" ADD COLUMN "pagamento_asaas_id" VARCHAR(60);

-- Impede a venda do mesmo número duas vezes no mesmo evento.
-- Só pode ser criado porque já foi verificado que não existem duplicados.
CREATE UNIQUE INDEX "pontos_host_id_numero_ponto_key" ON "pontos"("host_id", "numero_ponto");

-- Índice auxiliar para localizar rapidamente os pagamentos de uma cobrança.
CREATE INDEX "pagamentos_pagamento_asaas_id_idx" ON "pagamentos"("pagamento_asaas_id");
