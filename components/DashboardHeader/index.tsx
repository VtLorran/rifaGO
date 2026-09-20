"use client";

import React from "react";
import Image from "next/image";
import { CheckCircle, LogOut, Share2 } from "lucide-react";

interface DashboardHeaderProps {
  titulo: string;
  resumo: string;
  nome?: string;
  role: "host" | "member";
  linkCopiado: boolean;
  onCopiarLink: () => void;
  onLogout: () => void;
  children?: React.ReactNode;
}

export function DashboardHeader({
  titulo,
  resumo,
  nome,
  role,
  linkCopiado,
  onCopiarLink,
  onLogout,
  children,
}: DashboardHeaderProps) {
  return (
    <div className="bg-[#801818] text-white p-6 rounded-3xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
      {/* Lado Esquerdo: Logo + Título */}
      <div className="flex items-center gap-4 min-w-0">
        <Image
          src="/logo-2.png"
          alt="RifaGO Logo"
          width={140}
          height={50}
          className="object-contain shrink-0 drop-shadow hidden sm:block"
          priority
        />

        <div className="min-w-0">
          <span className="bg-amber-400 text-black font-extrabold text-[10px] px-2 py-0.5 rounded-md uppercase tracking-wider inline-block">
            {role === "host" ? "Painel Host" : "Painel Membro"}
          </span>
          <h1 className="text-xl font-bold mt-1 truncate">{titulo}</h1>
          <p className="text-xs text-white/80 mt-0.5 truncate">
            {resumo}
            {nome ? (
              <>
                {" "}
                <strong className="text-white">{nome}</strong>.
              </>
            ) : null}
          </p>
        </div>
      </div>

      {/* Lado Direito: Ações */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        {/* Link de Vendas (mesmo estilo para Host e Membro) */}
        <button
          onClick={onCopiarLink}
          className="bg-white/15 hover:bg-white/25 text-white font-bold text-xs px-4 py-2.5 rounded-2xl border border-white/20 shadow flex items-center gap-2 transition-all active:scale-95"
          title="Copiar meu link de vendas"
        >
          {linkCopiado ? (
            <>
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              <span>Link Copiado!</span>
            </>
          ) : (
            <>
              <Share2 className="w-4 h-4" />
              <span>Meu Link de Vendas</span>
            </>
          )}
        </button>

        {children}

        <button
          onClick={onLogout}
          className="bg-white/10 hover:bg-white/20 text-white p-2.5 rounded-2xl transition-all"
          title="Sair"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}