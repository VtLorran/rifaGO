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
} from "lucide-react";

const PREFIXO_CODIGO = "2024118ISINF";

export default function LoginPage() {
  const router = useRouter();
  const [digitos, setDigitos] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [exigeSenha, setExigeSenha] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  const handleDigitosChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valor = e.target.value.replace(/\D/g, "");
    setDigitos(valor);
    setErro(null);

    if (valor === "0000") {
      setExigeSenha(true);
      setIsHost(true);
    } else {
      setExigeSenha(false);
      setIsHost(false);
      setSenha("");
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);

    const digitosLimpos = digitos.trim();

    if (!/^\d{4}$/.test(digitosLimpos)) {
      setErro(
        "Por favor, digite exatamente os 4 dígitos numéricos do seu código.",
      );
      return;
    }

    const codigoCompleto = `${PREFIXO_CODIGO}${digitosLimpos}`;
    setCarregando(true);

    try {
      if (isHost) {
        // Login do Host via rota existente
        if (!senha.trim()) {
          setErro("A senha é obrigatória para o acesso de Host.");
          setCarregando(false);
          return;
        }

        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            codigo_login: codigoCompleto,
            senha,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          if (data.exigeSenha) {
            setExigeSenha(true);
          }
          throw new Error(
            data.error || "Erro ao realizar login. Verifique os dados.",
          );
        }

        if (data.user.tipo === "host") {
          router.push("/dashboard/host");
        } else {
          router.push("/dashboard/membro");
        }
      } else {
        // Fluxo para membros: primeiro verificar matrícula
        const verificarResponse = await fetch("/api/membros/verificar-matricula", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ digitos: digitosLimpos }),
        });

        const verificarData = await verificarResponse.json();

        if (!verificarResponse.ok) {
          throw new Error(
            verificarData.error || "Erro ao verificar matrícula.",
          );
        }

        // Se membro não tem senha, redireciona para primeiro acesso
        if (!verificarData.ja_possui_senha) {
          router.push("/membro/primeiro-acesso");
          return;
        }

        // Se membro já tem senha, pedir senha
        if (!exigeSenha) {
          setExigeSenha(true);
          setCarregando(false);
          return;
        }

        // Validar senha do membro
        if (!senha.trim()) {
          setErro("A senha é obrigatória.");
          setCarregando(false);
          return;
        }

        const loginResponse = await fetch("/api/membros/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            digitos: digitosLimpos,
            senha,
          }),
        });

        const loginData = await loginResponse.json();

        if (!loginResponse.ok) {
          if (loginData.primeiro_acesso) {
            router.push("/membro/primeiro-acesso");
            return;
          }
          throw new Error(
            loginData.error || "Erro ao realizar login.",
          );
        }

        router.push("/dashboard/membro");
      }

      router.refresh();
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
          <h1 className="text-xl font-bold">Área do Membro & Host</h1>
          <p className="text-xs text-white/80 font-semibold mt-1">
            Insira os seus dígitos de acesso para gerir as suas vendas.
          </p>
        </div>

        {/* Formulário */}
        <form onSubmit={handleLogin} className="p-8 space-y-5">
          {/* Erro */}
          {erro && (
            <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 text-red-700 p-3.5 rounded-2xl text-xs leading-relaxed animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span>{erro}</span>
            </div>
          )}

          {/* Campo do Código */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider">
              Código de Acesso
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
                onChange={handleDigitosChange}
                placeholder="0000"
                className="w-full bg-transparent px-4 py-3 text-base sm:text-sm font-mono font-extrabold text-neutral-900 tracking-widest placeholder:text-neutral-300 placeholder:font-normal focus:outline-none"
                autoFocus
              />
            </div>
            <p className="text-[11px] text-neutral-500 text-right">
              Digite apenas os{" "}
              <strong className="text-neutral-700">4 últimos números</strong>.
            </p>
          </div>

          {/* Campo de Senha (Host ou Membro) */}
          {exigeSenha && (
            <div className="space-y-2 pt-1 animate-fadeIn">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-[#801818] uppercase tracking-wider flex items-center gap-1">
                  <Lock className="w-3 h-3 text-[#801818]" />
                  <span>{isHost ? "Senha do Host" : "Sua Senha"}</span>
                </label>
                {isHost && (
                  <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full">
                    Acesso Host
                  </span>
                )}
              </div>

              <div className="relative flex items-center rounded-2xl border-2 border-[#801818]/30 focus-within:border-[#801818] transition-all bg-neutral-50/50 overflow-hidden">
                <input
                  type={mostrarSenha ? "text" : "password"}
                  value={senha}
                  onChange={(e) => {
                    setSenha(e.target.value);
                    setErro(null);
                  }}
                  placeholder={
                    isHost
                      ? "Digite sua senha secreta"
                      : "Digite sua senha"
                  }
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
          )}

          {/* Botão de Entrar */}
          <button
            type="submit"
            disabled={
              carregando ||
              digitos.length !== 4 ||
              (exigeSenha && !senha.trim())
            }
            className="w-full bg-[#801818] hover:bg-[#661313] disabled:bg-neutral-300 disabled:cursor-not-allowed text-white font-bold py-3.5 px-6 rounded-2xl shadow-lg shadow-[#801818]/20 flex items-center justify-center gap-2 text-sm transition-all active:scale-[0.99]"
          >
            {carregando ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>A verificar acesso...</span>
              </>
            ) : (
              <>
                <span>Aceder ao Painel</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          {/* Link Primeiro Acesso */}
          <div className="text-center">
            <a
              href="/membro/primeiro-acesso"
              className="text-xs text-[#801818] hover:text-[#661313] font-semibold underline underline-offset-2 transition-colors"
            >
              Primeiro acesso? Defina sua senha aqui
            </a>
          </div>

          {/* Rodapé */}
          <div className="pt-2 text-center flex items-center justify-center gap-1.5 text-[11px] text-neutral-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Acesso restrito e seguro por credencial do evento</span>
          </div>
        </form>
      </div>
    </div>
  );
}
