"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DollarSign,
  Ticket,
  Loader2,
  Copy,
  Check,
  AlertCircle,
  TrendingUp,
  ExternalLink,
} from "lucide-react";
import { DashboardHeader } from "@/components/DashboardHeader";
import { GradePontos } from "@/components/GradePontos/GradePontos";

interface PontoVendido {
  id: number;
  numero_ponto: number;
  status: string;
  comprador_nome: string | null;
  comprador_telefone: string | null;
  criado_em: string;
}

interface DashboardMembroData {
  host_id: number;
  nome_evento: string;
  membro: {
    id: number;
    nome: string;
    codigo_login: string | null;
    avatar_url: string | null;
  };
  resumo: {
    total_pontos_vendidos: number;
    valor_total_arrecadado: number;
    preco_por_ponto: number;
  };
  pontos: PontoVendido[];
}

export default function DashboardMembroPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardMembroData | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [linkCopiado, setLinkCopiado] = useState(false);

  const linkDivulgacao = data
    ? `${window.location.origin}/?ref=${data.membro.id}`
    : "";

  useEffect(() => {
    let ativo = true;

    fetch("/api/dashboard/membro")
      .then(async (response) => {
        if (response.status === 401 || response.status === 403) {
          if (ativo) router.push("/login");
          return null;
        }

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Erro ao carregar dados do painel.");
        }

        return result;
      })
      .then((result) => {
        if (ativo && result) setData(result);
      })
      .catch((err: unknown) => {
        if (!ativo) return;
        if (err instanceof Error) {
          setErro(err.message);
        } else {
          setErro("Ocorreu um erro ao carregar o dashboard.");
        }
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });

    return () => {
      ativo = false;
    };
  }, [router]);

  const refrescarDashboard = () => {
    fetch("/api/dashboard/membro")
      .then(async (response) => {
        if (response.status === 401 || response.status === 403) {
          router.push("/login");
          return null;
        }

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Erro ao carregar dados do painel.");
        }

        return result;
      })
      .then((result) => {
        if (result) setData(result);
      })
      .catch((err: unknown) => {
        console.error("Erro ao atualizar dashboard do membro:", err);
      });
  };

  const copiarLink = async () => {
    try {
      await navigator.clipboard.writeText(linkDivulgacao);
      setLinkCopiado(true);
      setTimeout(() => setLinkCopiado(false), 2000);
    } catch {
      setErro("Não foi possível copiar o link automaticamente.");
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  const formatarData = (iso: string) =>
    new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const statusBadge = (status: string) => {
    const estilos: Record<string, string> = {
      pendente: "bg-amber-100 text-amber-800",
      pago: "bg-emerald-100 text-emerald-800",
      cancelado: "bg-red-100 text-red-800",
    };
    const rotulo: Record<string, string> = {
      pendente: "Pendente",
      pago: "Pago",
      cancelado: "Cancelado",
    };
    return (
      <span
        className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
          estilos[status] ?? "bg-neutral-100 text-neutral-700"
        }`}
      >
        {rotulo[status] ?? status}
      </span>
    );
  };

  if (carregando) {
    return (
      <div className="min-h-screen bg-neutral-100 flex flex-col items-center justify-center gap-3 text-neutral-600">
        <Loader2 className="w-8 h-8 animate-spin text-[#801818]" />
        <span className="text-xs font-medium">
          Carregando painel do Membro...
        </span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-100 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* HEADER PADRÃO (IDÊNTICO AO DO HOST) */}
        <DashboardHeader
          role="member"
          titulo="Olá!"
          resumo="Acompanhe as suas vendas e divulgue o seu link exclusivo,"
          nome={data?.membro.nome}
          linkCopiado={linkCopiado}
          onCopiarLink={copiarLink}
          onLogout={handleLogout}
        />

        {/* BANNER DO LINK DE DIVULGAÇÃO (MESMO ESTILO DO HOST) */}
        <div className="bg-gradient-to-r from-neutral-900 to-neutral-800 text-white p-5 rounded-3xl shadow-md border border-neutral-700 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-white text-xs font-extrabold uppercase tracking-wider">
                Link de Vendas Membro
              </span>
            </div>
            <p className="text-xs text-white/70 font-semibold">
              Partilhe o seu link direto para atribuir as vendas realizadas a si
              automaticamente.
            </p>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <input
              type="text"
              readOnly
              value={linkDivulgacao}
              disabled={!linkDivulgacao}
              className="bg-neutral-950 border border-neutral-700 text-neutral-300 text-xs px-3 py-2.5 rounded-xl font-mono w-full md:w-72 select-all focus:outline-none"
            />
            <button
              onClick={copiarLink}
              disabled={!linkDivulgacao}
              className="bg-[#801818] hover:bg-[#661313] text-white p-2.5 rounded-xl transition-all shrink-0"
              title="Copiar Link"
            >
              {linkCopiado ? (
                <Check className="w-4 h-4 text-emerald-400" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
            <a
              href={linkDivulgacao}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-neutral-800 hover:bg-neutral-700 text-neutral-300 p-2.5 rounded-xl transition-all shrink-0 border border-neutral-700"
              title="Abrir em nova aba"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>

        {/* MENSAGENS DE FEEDBACK */}
        {erro && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <span>{erro}</span>
          </div>
        )}

        {/* GRID DE CARDS DE MÉTRICAS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card 1: Pontos Vendidos */}
          <div className="bg-white p-5 rounded-3xl border border-neutral-200 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider block">
                Pontos Vendidos
              </span>
              <span className="text-xl font-extrabold text-neutral-900 mt-1 block">
                {data?.resumo.total_pontos_vendidos} pts
              </span>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center">
              <Ticket className="w-5 h-5" />
            </div>
          </div>

          {/* Card 2: Valor Arrecadado */}
          <div className="bg-white p-5 rounded-3xl border border-neutral-200 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider block">
                Valor Arrecadado
              </span>
              <span className="text-xl font-extrabold text-neutral-900 mt-1 block">
                R${" "}
                {data?.resumo.valor_total_arrecadado
                  .toFixed(2)
                  .replace(".", ",")}
              </span>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>

          {/* Card 3: Preço por Ponto */}
          <div className="bg-white p-5 rounded-3xl border border-neutral-200 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider block">
                Comissão por Ponto
              </span>
              <span className="text-xl font-extrabold text-neutral-900 mt-1 block">
                R$ {data?.resumo.preco_por_ponto.toFixed(2).replace(".", ",")}
              </span>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* TABELA DE HISTÓRICO DE VENDAS */}
        <div className="bg-white rounded-3xl border border-neutral-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-neutral-100 flex items-center justify-between">
            <h2 className="text-base font-bold text-neutral-900">
              Pontos Vendidos
            </h2>
            <span className="text-xs text-neutral-400">
              {data?.pontos.length} ponto(s) vendido(s)
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 text-neutral-500 uppercase font-semibold border-b border-neutral-100">
                <tr>
                  <th className="px-6 py-4">Ponto</th>
                  <th className="px-6 py-4">Comprador</th>
                  <th className="px-6 py-4">Telefone</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-right">Data / Hora</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 text-neutral-800">
                {data?.pontos.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="text-center py-8 text-neutral-400"
                    >
                      Nenhum ponto vendido até o momento.
                    </td>
                  </tr>
                ) : (
                  data?.pontos.map((ponto) => (
                    <tr
                      key={ponto.id}
                      className="hover:bg-neutral-50/50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-2 font-mono font-extrabold text-neutral-900">
                          <span className="w-7 h-7 rounded-lg bg-[#801818]/10 text-[#801818] flex items-center justify-center text-xs">
                            {String(ponto.numero_ponto).padStart(4, "0")}
                          </span>
                        </span>
                      </td>
                      <td className="px-6 py-4 font-bold">
                        {ponto.comprador_nome ?? "—"}
                      </td>
                      <td className="px-6 py-4 font-mono text-neutral-500">
                        {ponto.comprador_telefone ?? "—"}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {statusBadge(ponto.status)}
                      </td>
                      <td className="px-6 py-4 text-right text-neutral-500">
                        {formatarData(ponto.criado_em)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* GRADE DE PONTOS (MESMA DO CLIENTE, COM BARRA DE PESQUISA) - ÚLTIMO DA TELA */}
        {data && (
          <GradePontos
            hostId={data.host_id}
            modo="member"
            onVendasAlteradas={refrescarDashboard}
          />
        )}
      </div>
    </div>
  );
}
