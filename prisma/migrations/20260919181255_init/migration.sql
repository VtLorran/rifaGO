/*
  Warnings:

  - You are about to drop the `Raffle` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Ticket` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Ticket" DROP CONSTRAINT "Ticket_raffleId_fkey";

-- DropTable
DROP TABLE "Raffle";

-- DropTable
DROP TABLE "Ticket";

-- CreateTable
CREATE TABLE "usuarios" (
    "id" SERIAL NOT NULL,
    "nome" VARCHAR(150) NOT NULL,
    "codigo_login" TEXT,
    "avatar_url" TEXT,
    "tipo" VARCHAR(10) NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hosts" (
    "id" SERIAL NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "nome_evento" VARCHAR(150) NOT NULL,
    "valor_arrecadado" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hosts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pontos" (
    "id" SERIAL NOT NULL,
    "host_id" INTEGER NOT NULL,
    "usuario_id" INTEGER,
    "nome_comprador" VARCHAR(150),
    "telefone_comprador" VARCHAR(20),
    "numero_ponto" VARCHAR(50) NOT NULL,
    "status" VARCHAR(10) NOT NULL DEFAULT 'pendente',
    "membro_indicador_id" INTEGER,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pontos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "indicacoes" (
    "id" SERIAL NOT NULL,
    "usuario_indicador_id" INTEGER NOT NULL,
    "usuario_indicado_id" INTEGER NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "indicacoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pagamentos" (
    "id" SERIAL NOT NULL,
    "ponto_id" INTEGER NOT NULL,
    "indicacao_id" INTEGER,
    "valor" DECIMAL(12,2) NOT NULL,
    "forma_pagamento" VARCHAR(30) NOT NULL,
    "status" VARCHAR(10) NOT NULL DEFAULT 'pendente',
    "processado_em" TIMESTAMP(3),

    CONSTRAINT "pagamentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "links_compartilhamento" (
    "id" SERIAL NOT NULL,
    "membro_id" INTEGER NOT NULL,
    "ponto_id" INTEGER NOT NULL,
    "url" VARCHAR(255) NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "links_compartilhamento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_codigo_login_key" ON "usuarios"("codigo_login");

-- AddForeignKey
ALTER TABLE "hosts" ADD CONSTRAINT "hosts_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pontos" ADD CONSTRAINT "pontos_host_id_fkey" FOREIGN KEY ("host_id") REFERENCES "hosts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pontos" ADD CONSTRAINT "pontos_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "indicacoes" ADD CONSTRAINT "indicacoes_usuario_indicador_id_fkey" FOREIGN KEY ("usuario_indicador_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "indicacoes" ADD CONSTRAINT "indicacoes_usuario_indicado_id_fkey" FOREIGN KEY ("usuario_indicado_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagamentos" ADD CONSTRAINT "pagamentos_ponto_id_fkey" FOREIGN KEY ("ponto_id") REFERENCES "pontos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagamentos" ADD CONSTRAINT "pagamentos_indicacao_id_fkey" FOREIGN KEY ("indicacao_id") REFERENCES "indicacoes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "links_compartilhamento" ADD CONSTRAINT "links_compartilhamento_membro_id_fkey" FOREIGN KEY ("membro_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "links_compartilhamento" ADD CONSTRAINT "links_compartilhamento_ponto_id_fkey" FOREIGN KEY ("ponto_id") REFERENCES "pontos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
