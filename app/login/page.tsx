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
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  // Monitora a digitação dos 4 dígitos para exibir o campo de senha se for '0000'
  const handleDigitosChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const valor = e.target.value.replace(/\D/g, "");
    setDigitos(valor);
    setErro(null);

    if (valor === "0000") {
      setExigeSenha(true);
    } else {
      setExigeSenha(false);
      setSenha("");
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);

    const digitosLimpos = digitos.trim();

    // Validação local rápida
    if (!/^\d{4}$/.test(digitosLimpos)) {
      setErro(
        "Por favor, digite exatamente os 4 dígitos numéricos do seu código.",
      );
      return;
    }

    if (exigeSenha && !senha.trim()) {
      setErro("A senha é obrigatória para o acesso de Host.");
      return;
    }

    const codigoCompleto = `${PREFIXO_CODIGO}${digitosLimpos}`;
    setCarregando(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          codigo_login: codigoCompleto,
          senha: exigeSenha ? senha : undefined,
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

      // Redireciona conforme o tipo de usuário retornado
      if (data.user.tipo === "host") {
        router.push("/dashboard/host");
      } else {
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
      {/* Card Principal */}
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden border border-neutral-200">
        {/* Banner Superior no tom Vinho/Vermelho */}
        <div className="bg-[#801818] p-8 text-white text-center flex flex-col items-center justify-center relative">
          {/* Circulo decorativo de fundo */}
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
          <p className="text-xs text-white/80 font font-semibold mt-1">
            Insira os seus dígitos de acesso para gerir as suas vendas.
          </p>
        </div>

        {/* Formulário de Login */}
        <form onSubmit={handleLogin} className="p-8 space-y-5">
          {/* Exibição de Erro */}
          {erro && (
            <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 text-red-700 p-3.5 rounded-2xl text-xs leading-relaxed animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span>{erro}</span>
            </div>
          )}

          {/* Campo do Código com Prefixo Fixo */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider">
              Código de Acesso
            </label>

            <div className="flex items-center rounded-2xl border-2 border-neutral-200 focus-within:border-[#801818] transition-all bg-neutral-50/50 overflow-hidden">
              {/* Prefixo Fixo (Bloqueado) */}
              <div className="bg-neutral-100 border-r border-neutral-200 px-3.5 py-3 text-xs font-mono font-bold text-neutral-500 select-none flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-neutral-400" />
                <span>{PREFIXO_CODIGO}</span>
              </div>

              {/* Input dos 4 últimos dígitos */}
              <input
                type="text"
                inputMode="numeric"
                maxLength={4}
                value={digitos}
                onChange={handleDigitosChange}
                placeholder="0000"
                className="w-full bg-transparent px-4 py-3 text-sm font-mono font-extrabold text-neutral-900 tracking-widest placeholder:text-neutral-300 placeholder:font-normal focus:outline-none"
                autoFocus
              />
            </div>
            <p className="text-[11px] text-neutral-500 text-right">
              Digite apenas os{" "}
              <strong className="text-neutral-700">4 últimos números</strong>.
            </p>
          </div>

          {/* Campo de Senha Secreta do Host (Aparece dinamicamente) */}
          {exigeSenha && (
            <div className="space-y-2 pt-1 animate-fadeIn">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-[#801818] uppercase tracking-wider flex items-center gap-1">
                  <Lock className="w-3 h-3 text-[#801818]" />
                  <span>Senha do Host</span>
                </label>
                <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full">
                  Acesso Host
                </span>
              </div>

              <div className="relative flex items-center rounded-2xl border-2 border-[#801818]/30 focus-within:border-[#801818] transition-all bg-neutral-50/50 overflow-hidden">
                <input
                  type={mostrarSenha ? "text" : "password"}
                  value={senha}
                  onChange={(e) => {
                    setSenha(e.target.value);
                    setErro(null);
                  }}
                  placeholder="Digite sua senha secreta"
                  className="w-full bg-transparent px-4 py-3 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none pr-10"
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

          {/* Rodapé / Informação de Segurança */}
          <div className="pt-2 text-center flex items-center justify-center gap-1.5 text-[11px] text-neutral-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Acesso restrito e seguro por credencial do evento</span>
          </div>
        </form>
      </div>
    </div>
  );
}
