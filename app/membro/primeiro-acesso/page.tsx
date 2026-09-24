"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  KeyRound,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Loader2,
  Lock,
  Eye,
  EyeOff,
  CheckCircle,
  User,
} from "lucide-react";

const PREFIXO_CODIGO = "2024118ISINF";

type Etapa = "matricula" | "senha" | "sucesso";

export default function PrimeiroAcessoPage() {
  const router = useRouter();
  const [etapa, setEtapa] = useState<Etapa>("matricula");
  const [digitos, setDigitos] = useState("");
  const [membroId, setMembroId] = useState<number | null>(null);
  const [nomeMembro, setNomeMembro] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  const handleVerificarMatricula = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);

    if (!/^\d{4}$/.test(digitos.trim())) {
      setErro("Digite exatamente os 4 dígitos numéricos da sua matrícula.");
      return;
    }

    setCarregando(true);

    try {
      const response = await fetch("/api/membros/verificar-matricula", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ digitos: digitos.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao verificar matrícula.");
      }

      if (data.ja_possui_senha) {
        setErro(
          "Esta conta já possui senha cadastrada. Você será redirecionado para o login.",
        );
        setTimeout(() => router.push("/login"), 3000);
        return;
      }

      setMembroId(data.membro_id);
      setNomeMembro(data.nome);
      setEtapa("senha");
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErro(err.message);
      } else {
        setErro("Ocorreu um erro inesperado. Tente novamente.");
      }
    } finally {
      setCarregando(false);
    }
  };

  const handleDefinirSenha = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);

    if (senha.length < 4) {
      setErro("A senha deve ter pelo menos 4 caracteres.");
      return;
    }

    if (senha !== confirmarSenha) {
      setErro("As senhas não coincidem.");
      return;
    }

    setCarregando(true);

    try {
      const response = await fetch("/api/membros/definir-senha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          membro_id: membroId,
          senha,
          confirmar_senha: confirmarSenha,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.redirecionar_login) {
          setErro(data.error);
          setTimeout(() => router.push("/login"), 3000);
          return;
        }
        throw new Error(data.error || "Erro ao definir senha.");
      }

      setEtapa("sucesso");
      setTimeout(() => router.push("/login"), 3000);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErro(err.message);
      } else {
        setErro("Ocorreu um erro inesperado. Tente novamente.");
      }
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden border border-neutral-200">
        {/* Banner */}
        <div className="bg-[#801818] p-8 text-white text-center flex flex-col items-center justify-center relative">
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-white/5 rounded-full blur-xl pointer-events-none" />

          <Image
            src="/logo-2.png"
            alt="RifaGO Logo"
            width={140}
            height={50}
            className="object-contain mb-3 drop-shadow"
            priority
          />
          <h1 className="text-xl font-bold">Primeiro Acesso</h1>
          <p className="text-xs text-white/80 font-semibold mt-1">
            Defina sua senha para acessar o painel do membro.
          </p>
        </div>

        <div className="p-8 space-y-5">
          {/* Erro */}
          {erro && (
            <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 text-red-700 p-3.5 rounded-2xl text-xs leading-relaxed animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span>{erro}</span>
            </div>
          )}

          {/* Etapa 1: Verificar Matrícula */}
          {etapa === "matricula" && (
            <form onSubmit={handleVerificarMatricula} className="space-y-5">
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider">
                  Últimos 4 dígitos da Matrícula
                </label>

                <div className="flex items-center rounded-2xl border-2 border-neutral-200 focus-within:border-[#801818] transition-all bg-neutral-50/50 overflow-hidden">
                  <div className="bg-neutral-100 border-r border-neutral-200 px-3.5 py-3 text-xs font-mono font-bold text-neutral-500 select-none flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-neutral-400" />
                    <span>{PREFIXO_CODIGO}</span>
                  </div>

                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={4}
                    value={digitos}
                    onChange={(e) => {
                      setDigitos(e.target.value.replace(/\D/g, ""));
                      setErro(null);
                    }}
                    placeholder="0000"
                    className="w-full bg-transparent px-4 py-3 text-base sm:text-sm font-mono font-extrabold text-neutral-900 tracking-widest placeholder:text-neutral-300 placeholder:font-normal focus:outline-none"
                    autoFocus
                  />
                </div>
                <p className="text-[11px] text-neutral-500 text-right">
                  Digite apenas os{" "}
                  <strong className="text-neutral-700">
                    4 últimos números
                  </strong>{" "}
                  da sua matrícula.
                </p>
              </div>

              <button
                type="submit"
                disabled={carregando || digitos.length !== 4}
                className="w-full bg-[#801818] hover:bg-[#661313] disabled:bg-neutral-300 disabled:cursor-not-allowed text-white font-bold py-3.5 px-6 rounded-2xl shadow-lg shadow-[#801818]/20 flex items-center justify-center gap-2 text-sm transition-all active:scale-[0.99]"
              >
                {carregando ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>A verificar...</span>
                  </>
                ) : (
                  <>
                    <span>Verificar Matrícula</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Etapa 2: Definir Senha */}
          {etapa === "senha" && (
            <>
              <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 p-4 rounded-2xl">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <User className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs text-emerald-600 font-semibold">
                    Membro encontrado
                  </p>
                  <p className="text-sm font-bold text-emerald-800">
                    {nomeMembro}
                  </p>
                </div>
              </div>

              <form onSubmit={handleDefinirSenha} className="space-y-4">
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider flex items-center gap-1">
                    <Lock className="w-3 h-3 text-[#801818]" />
                    <span>Nova Senha</span>
                  </label>

                  <div className="relative flex items-center rounded-2xl border-2 border-neutral-200 focus-within:border-[#801818] transition-all bg-neutral-50/50 overflow-hidden">
                    <input
                      type={mostrarSenha ? "text" : "password"}
                      value={senha}
                      onChange={(e) => {
                        setSenha(e.target.value);
                        setErro(null);
                      }}
                      placeholder="Crie uma senha (mín. 4 caracteres)"
                      className="w-full bg-transparent px-4 py-3 text-base sm:text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setMostrarSenha(!mostrarSenha)}
                      className="absolute right-3 text-neutral-400 hover:text-neutral-600 transition-colors"
                    >
                      {mostrarSenha ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider">
                    Confirmar Senha
                  </label>

                  <input
                    type={mostrarSenha ? "text" : "password"}
                    value={confirmarSenha}
                    onChange={(e) => {
                      setConfirmarSenha(e.target.value);
                      setErro(null);
                    }}
                    placeholder="Repita a senha"
                    className="w-full bg-transparent px-4 py-3 rounded-2xl border-2 border-neutral-200 focus:border-[#801818] transition-all bg-neutral-50/50 text-base sm:text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={
                    carregando ||
                    senha.length < 4 ||
                    confirmarSenha.length < 4
                  }
                  className="w-full bg-[#801818] hover:bg-[#661313] disabled:bg-neutral-300 disabled:cursor-not-allowed text-white font-bold py-3.5 px-6 rounded-2xl shadow-lg shadow-[#801818]/20 flex items-center justify-center gap-2 text-sm transition-all active:scale-[0.99]"
                >
                  {carregando ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>A definir senha...</span>
                    </>
                  ) : (
                    <>
                      <span>Definir Senha</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </>
          )}

          {/* Etapa 3: Sucesso */}
          {etapa === "sucesso" && (
            <div className="text-center space-y-4 py-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
                <CheckCircle className="w-8 h-8 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-neutral-900">
                  Senha definida com sucesso!
                </h3>
                <p className="text-xs text-neutral-500 mt-1">
                  Você será redirecionado para a tela de login em alguns
                  segundos.
                </p>
              </div>
            </div>
          )}

          {/* Rodapé */}
          <div className="pt-2 text-center flex items-center justify-center gap-1.5 text-[11px] text-neutral-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Acesso restrito e seguro por credencial do evento</span>
          </div>
        </div>
      </div>
    </div>
  );
}
