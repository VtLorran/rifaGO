import Image from "next/image";
import Link from "next/link";
import { Clock, LogIn, Wrench } from "lucide-react";
import { MENSAGEM_PADRAO_MANUTENCAO } from "@/lib/mensagens";

interface AvisoManutencaoProps {
  mensagem?: string;
}

/**
 * Tela exibida a clientes e visitantes enquanto a plataforma está pausada.
 * Membros e hosts continuam a aceder normalmente aos seus painéis.
 */
export function AvisoManutencao({ mensagem }: AvisoManutencaoProps) {
  return (
    <section className="w-full min-h-screen bg-neutral-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-neutral-200 overflow-hidden text-center">
        <div className="bg-[#801818] p-8 text-white flex flex-col items-center justify-center relative">
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-white/5 rounded-full blur-xl pointer-events-none" />

          <Image
            src="/logo-2.png"
            alt="RifaGO Logo"
            width={140}
            height={50}
            className="object-contain mb-4 drop-shadow"
            priority
          />

          <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center">
            <Wrench className="w-6 h-6" />
          </div>
        </div>

        <div className="p-8 space-y-5">
          <div className="space-y-2">
            <h1 className="text-lg font-extrabold text-neutral-900">
              {mensagem || MENSAGEM_PADRAO_MANUTENCAO}
            </h1>
            <p className="text-xs text-neutral-500 leading-relaxed">
              Estamos a realizar uma manutenção na plataforma. As compras e os
              pagamentos estão temporariamente indisponíveis.
            </p>
          </div>

          <div className="flex items-center justify-center gap-2 text-[11px] text-neutral-400 font-medium">
            <Clock className="w-3.5 h-3.5" />
            <span>Retornamos o mais breve possível</span>
          </div>

          <Link
            href="/login"
            className="w-full bg-[#801818] hover:bg-[#661313] text-white font-bold py-3.5 px-6 rounded-2xl shadow-lg shadow-[#801818]/20 flex items-center justify-center gap-2 text-sm transition-all active:scale-[0.99]"
          >
            <LogIn className="w-4 h-4" />
            <span>Entrar como Membro ou Host</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
