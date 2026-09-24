"use client";

import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  Gift,
  Ticket,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  Info,
} from "lucide-react";

export default function SobrePage() {
  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <div className="bg-[#801818] text-white px-4 py-4 sm:px-6">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-white/80 hover:text-white text-xs font-semibold transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar</span>
          </Link>
          <Image
            src="/logo-2.png"
            alt="RifaGO Logo"
            width={100}
            height={35}
            className="object-contain"
            priority
          />
        </div>
      </div>

      {/* Conteúdo */}
      <main className="max-w-4xl mx-auto px-4 py-6 sm:py-10 space-y-6">
        {/* Cabeçalho Principais Informações */}
        <div className="bg-[#801818] text-white p-6 sm:p-8 rounded-3xl shadow-xl relative overflow-hidden">
          <div className="absolute -top-16 -right-16 w-48 h-48 bg-white/5 rounded-full blur-2xl pointer-events-none" />
          <div className="relative z-10">
            <span className="inline-flex items-center gap-1.5 bg-white/20 text-white text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wider mb-3">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              Transparência & Sorte
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold mb-2">
              Sobre o Evento RifaGO
            </h2>
            <p className="text-white/80 text-sm sm:text-base leading-relaxed max-w-2xl">
              Participe do nosso sorteio, apoie o nosso evento e concorra a
              prêmios incríveis com total praticidade e segurança!
            </p>
          </div>
        </div>

        {/* Destaque do Valor do Ponto */}
        <div className="bg-emerald-50 border border-emerald-200 p-5 rounded-2xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
              <Ticket className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider block">
                Valor por Ponto
              </span>
              <span className="text-2xl font-extrabold text-emerald-700">
                R$ 5,00
              </span>
            </div>
          </div>
          <div className="text-right text-xs text-emerald-800 font-medium hidden sm:block">
            Escolha quantos pontos quiser <br /> e aumente suas chances!
          </div>
        </div>

        {/* Seção dos Prêmios */}
        <div>
          <h3 className="text-base font-bold text-neutral-900 mb-3 flex items-center gap-2">
            <Gift className="w-5 h-5 text-[#801818]" />
            Prêmios do Sorteio
          </h3>
          <p className="text-xs text-neutral-500 mb-4">
            Serão sorteados{" "}
            <strong>2 pontos diferentes</strong>, e cada ponto premiado
            garantirá um dos prêmios abaixo:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Prêmio 1 */}
            <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-sm flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-sm shrink-0">
                1º
              </div>
              <div>
                <h4 className="font-bold text-neutral-900 text-sm">
                  Kit Teclado + Mouse
                </h4>
                <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
                  Um kit completo de teclado e mouse para turbinar seus
                  estudos, trabalho ou jogatinas.
                </p>
              </div>
            </div>

            {/* Prêmio 2 */}
            <div className="bg-white p-5 rounded-2xl border border-neutral-200 shadow-sm flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-sm shrink-0">
                2º
              </div>
              <div>
                <h4 className="font-bold text-neutral-900 text-sm">
                  Fone de Ouvido
                </h4>
                <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
                  Um fone de ouvido de alta qualidade para aproveitar suas
                  músicas e conteúdos com total imersão.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Passo a Passo de Como Funciona */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-neutral-200 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
            <Info className="w-4 h-4 text-[#801818]" />
            Como Funciona o Sorteio?
          </h3>

          <ul className="space-y-3 text-xs text-neutral-600 leading-relaxed">
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                <strong>Escolha dos Pontos:</strong> Acesse a grade do evento,
                escolha os seus números da sorte e preencha seus dados de
                contato.
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                <strong>Pagamento Rápido via Pix:</strong> Cada ponto custa
                apenas R$ 5,00. O pagamento é confirmado automaticamente pelo
                Asaas em poucos segundos.
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                <strong>Dois Pontos Sorteados:</strong> No dia do sorteio, 2
                números serão contemplados de forma totalmente transparente!
              </span>
            </li>
          </ul>
        </div>

        {/* Garantia e Suporte */}
        <div className="bg-neutral-50 p-4 rounded-2xl border border-neutral-200 flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <p className="text-xs text-neutral-600 leading-relaxed">
            <strong>Compra Segura e Confirmada:</strong> Seus pontos ficam
            vinculados ao seu nome e telefone assim que o pagamento Pix é
            concluído.
          </p>
        </div>
      </main>
    </div>
  );
}
