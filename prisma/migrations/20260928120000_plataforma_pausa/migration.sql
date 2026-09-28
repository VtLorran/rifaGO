-- CreateTable
CREATE TABLE "configuracoes_plataforma" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "pausada" BOOLEAN NOT NULL DEFAULT false,
    "mensagem" VARCHAR(255) NOT NULL DEFAULT 'Plataforma pausada para manutenção',
    "pausado_por" INTEGER,
    "pausado_em" TIMESTAMP(3),
    "atualizado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "configuracoes_plataforma_pkey" PRIMARY KEY ("id")
);

-- Registo único inicial com a plataforma ativa
INSERT INTO "configuracoes_plataforma" ("id", "pausada", "mensagem")
VALUES (1, false, 'Plataforma pausada para manutenção');
