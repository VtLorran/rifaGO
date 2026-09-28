import { ShieldCheck, Wrench } from "lucide-react";

/**
 * Aviso mostrado a membros e hosts que continuam a ver a rifa enquanto a
 * plataforma está pausada. Sem isto, não há como distinguir "pausada e estou
 * com acesso privilegiado" de "a pausa não está a funcionar".
 */
export function BannerManutencaoAtiva() {
  return (
    <div className="w-full bg-amber-400 text-neutral-900 px-4 py-3 flex flex-col sm:flex-row items-center justify-center gap-2 text-center">
      <span className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider">
        <Wrench className="w-4 h-4 shrink-0" />
        <span>Plataforma pausada para manutenção</span>
      </span>

      <span className="text-[11px] font-semibold flex items-center gap-1.5 sm:border-l sm:border-neutral-900/20 sm:pl-3">
        <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
        Você está vendo como Membro/Host. Clientes e visitantes veem a tela de
        manutenção.
      </span>
    </div>
  );
}
