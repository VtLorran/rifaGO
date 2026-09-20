"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { LogIn, Share2, ShoppingBag, LogOut, User } from "lucide-react";

interface HeaderProps {
  // Estado mockado ou vindo do seu contexto/cookie
  user?: {
    nome: string;
    tipo: "host" | "member";
    avatar_url?: string;
  } | null;

  // Informações para o cliente
  indicadorNome?: string; 
  carrinhoPontosCount?: number; 
  carrinhoTotal?: number; 

  // Funções
  onCopyLink?: () => void;
  onLogout?: () => void;
}

export function Header({
  user,
  indicadorNome,
  carrinhoPontosCount = 0,
  carrinhoTotal = 0,
  onCopyLink,
  onLogout,
}: HeaderProps) {
  return (
    <header className="w-full bg-[#801818] text-white px-6 py-3 rounded-b-2xl shadow-md flex items-center justify-between">
      {/* 1. Lado Esquerdo: Logo + Badge de Indicação */}
      <div className="flex items-center gap-4">
        <Link href="/" className="flex items-center">
          <Image
            src="/logo-2.png" // Ajuste para o caminho do seu logo
            alt="RifaGO Logo"
            width={120}
            height={40}
            className="object-contain"
            priority
          />
        </Link>

        {/* Badge discreto se o comprador veio por um link de membro */}
        {!user && indicadorNome && (
          <div className="hidden sm:flex items-center gap-1.5 bg-black/20 backdrop-blur-sm border border-white/10 px-3 py-1 rounded-full text-xs text-amber-200">
            <span>Indicado por:</span>
            <strong className="text-white font-semibold">
              {indicadorNome}
            </strong>
          </div>
        )}
      </div>

      {/* 2. Lado Direito: Varia de acordo com o Usuário */}
      <div className="flex items-center gap-3">
        {/* VISÃO 1: Visitante / Cliente Comprador */}
        {!user && (
          <>
            {carrinhoPontosCount > 0 && (
              <div className="flex items-center gap-2 bg-white/10 border border-white/20 px-3 py-1.5 rounded-xl text-xs font-medium">
                <ShoppingBag className="w-4 h-4 text-emerald-400" />
                <span>
                  {carrinhoPontosCount}{" "}
                  {carrinhoPontosCount === 1 ? "ponto" : "pontos"}
                </span>
                <span className="text-white/40">|</span>
                <span className="text-emerald-300 font-bold">
                  R$ {carrinhoTotal.toFixed(2).replace(".", ",")}
                </span>
              </div>
            )}

            {/* Botão Entrar na Área do Membro/Host */}
            <Link
              href="/login"
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all border border-white/10"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Área do Membro</span>
            </Link>
          </>
        )}

        {/* VISÃO 2: Membro Logado */}
        {user && user.tipo === "member" && (
          <>
            {/* Botão rápido para copiar o link de indicação */}
            <button
              onClick={onCopyLink}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow transition-all"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Copiar Meu Link</span>
            </button>

            {/* Avatar / Perfil do Membro */}
            <div className="flex items-center gap-2 bg-black/20 pl-2 pr-3 py-1 rounded-xl border border-white/10">
              <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center font-bold text-xs border border-amber-500/30">
                {user.nome.charAt(0).toUpperCase()}
              </div>
              <span className="text-xs font-medium max-w-[100px] truncate">
                {user.nome}
              </span>
            </div>

            {/* Botão Sair */}
            <button
              onClick={onLogout}
              className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-all"
              title="Sair"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </>
        )}

        {/* VISÃO 3: Host Logado */}
        {user && user.tipo === "host" && (
          <>
            <span className="bg-amber-400 text-black font-extrabold text-[10px] px-2.5 py-1 rounded-md uppercase tracking-wider">
              HOST
            </span>

            <div className="flex items-center gap-2 bg-black/20 pl-2 pr-3 py-1 rounded-xl border border-white/10">
              <User className="w-4 h-4 text-white/70" />
              <span className="text-xs font-medium">{user.nome}</span>
            </div>

            <button
              onClick={onLogout}
              className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-all"
              title="Sair"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </>
        )}
      </div>
    </header>
  );
}
