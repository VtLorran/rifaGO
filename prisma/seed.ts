import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({
  connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Iniciando seed do banco de dados...");

  // Código de acesso do Host (Prefix 2024118ISINF + 0000)
  const CODIGO_HOST = "2024118ISINF0000";

  // Senha secreta de acesso para o Host
  const SENHA_HOST_EM_TEXTO_PURO = "@Lorran27";

  // Criptografa a senha com bcrypt
  const senhaHash = await bcrypt.hash(SENHA_HOST_EM_TEXTO_PURO, 10);

  // 1. Cria ou atualiza o usuário Host no banco
  const hostUser = await prisma.usuario.upsert({
    where: { codigo_login: CODIGO_HOST },
    update: {
      senha_hash: senhaHash,
    },
    create: {
      nome: "HOST",
      codigo_login: CODIGO_HOST,
      senha_hash: senhaHash,
      tipo: "host",
      avatar_url: "/host.jpg",
    },
  });

  // 2. Cria ou garante a existência do evento principal vinculado a este Host (ID = 1)
  const evento = await prisma.host.upsert({
    where: { id: 1 },
    update: {},
    create: {
      usuario_id: hostUser.id,
      nome_evento: "RifaGO - Evento Principal 1080 Pontos",
      valor_arrecadado: 0.0,
    },
  });

  console.log("✅ Seed executado com sucesso!\n");
  console.log("--------------------------------------------------");
  console.log("🔑 CREDENCIAIS DO HOST PARA TESTE:");
  console.log(`👤 Nome: ${hostUser.nome}`);
  console.log(`🆔 Código de Login: ${hostUser.codigo_login}`);
  console.log(`🔢 4 Dígitos no Login: 0000`);
  console.log(`🔒 Senha de Acesso: ${SENHA_HOST_EM_TEXTO_PURO}`);
  console.log(`🎯 ID do Evento: ${evento.id}`);
  console.log("--------------------------------------------------\n");
}

main()
  .catch((e) => {
    console.error("❌ Erro ao executar o seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
