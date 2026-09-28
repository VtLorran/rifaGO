import { HomeContentRifa } from "@/components/HomeContentRifa";
import { AvisoManutencao } from "@/components/AvisoManutencao";
import { getBloqueioDeAcesso } from "@/lib/plataforma";

// A home lê o estado de manutenção no banco e a sessão do utilizador,
// portanto nunca pode ser servida a partir de cache estático.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  // Enquanto a plataforma estiver pausada, apenas membros e hosts (que já
  // têm sessão) conseguem ver a rifa. Todos os outros recebem o aviso de
  // manutenção com a opção de entrar no painel.
  const bloqueio = await getBloqueioDeAcesso();

  if (bloqueio) {
    return <AvisoManutencao mensagem={bloqueio.mensagem} />;
  }

  return <HomeContentRifa />;
}
