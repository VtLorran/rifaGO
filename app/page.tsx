import { HomeContentRifa } from "@/components/HomeContentRifa";
import { AvisoManutencao } from "@/components/AvisoManutencao";
import { BannerManutencaoAtiva } from "@/components/BannerManutencaoAtiva";
import { ehUsuarioInterno, getEstadoPlataforma } from "@/lib/plataforma";
import { getAuthUser } from "@/lib/auth";

// A home lê o estado de manutenção no banco e a sessão do utilizador,
// portanto nunca pode ser servida a partir de cache estático.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const estado = await getEstadoPlataforma();

  if (!estado.pausada) {
    return <HomeContentRifa />;
  }

  const user = await getAuthUser();

  // Clientes e visitantes não logados recebem o aviso de manutenção com a
  // opção de entrar no painel.
  if (!ehUsuarioInterno(user)) {
    return <AvisoManutencao mensagem={estado.mensagem} />;
  }

  // Membros e hosts seguem a operar, mas com um aviso explícito de que a
  // pausa está ativa e de que a visão deles é privilegiada.
  return (
    <>
      <BannerManutencaoAtiva />
      <HomeContentRifa />
    </>
  );
}
