"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  DollarSign,
  Ticket,
  UserPlus,
  Loader2,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Copy,
  Pencil,
  Trash2,
  Save,
  ExternalLink,
  Check,
} from "lucide-react";
import { DashboardHeader } from "@/components/DashboardHeader";
import { GradePontos } from "@/components/GradePontos/GradePontos";

interface MembroRanking {
  membro_id: number;
  nome: string;
  codigo_login: string;
  pontos_vendidos: number;
  valor_arrecadado: number;
  numeros_pontos: string[];
}

interface DashboardHostData {
  evento: {
    id: number;
    nome_evento: string;
    limite_total_pontos: number;
  };
  resumo_geral: {
    total_pontos_vendidos: number;
    pontos_restantes: number;
    valor_total_arrecadado: number;
    porcentagem_concluida: number;
  };
  vendas_diretas_host: {
    quantidade: number;
    valor: number;
  };
  membros: MembroRanking[];
}

export default function DashboardHostPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardHostData | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  // Estados do Modal de Cadastrar Membro
  const [modalMembroAberto, setModalMembroAberto] = useState(false);
  const [novoMembroNome, setNovoMembroNome] = useState("");
  const [novoMembroCodigo, setNovoMembroCodigo] = useState("");
  const [salvandoMembro, setSalvandoMembro] = useState(false);
  const [membroSucesso, setMembroSucesso] = useState<string | null>(null);

  // Estados do Modal de Editar Membro
  const [membroEditando, setMembroEditando] = useState<MembroRanking | null>(
    null,
  );
  const [editMembroNome, setEditMembroNome] = useState("");
  const [editandoMembro, setEditandoMembro] = useState(false);
  const [editMembroErro, setEditMembroErro] = useState<string | null>(null);

  // Estado para feedback de cópia do link do Host
  const [copiadoHost, setCopiadoHost] = useState(false);

  useEffect(() => {
    let ativo = true;

    fetch("/api/dashboard/host?host_id=1")
      .then(async (response) => {
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
  }, []);

  const refrescarDashboard = () => {
    fetch("/api/dashboard/host?host_id=1")
      .then(async (response) => {
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
        console.error("Erro ao atualizar dashboard do host:", err);
      });
  };

  const linkVendaHost =
    typeof window !== "undefined" ? `${window.location.origin}/?ref=host` : "";

  const handleCopiarLinkHost = () => {
    navigator.clipboard.writeText(linkVendaHost);
    setCopiadoHost(true);
    setTimeout(() => setCopiadoHost(false), 3000);
  };

  const handleCadastrarMembro = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    setMembroSucesso(null);

    if (!novoMembroNome || !/^\d{4}$/.test(novoMembroCodigo)) {
      setErro(
        "Informe o nome e exatamente os 4 dígitos para o código de login.",
      );
      return;
    }

    setSalvandoMembro(true);

    try {
      const response = await fetch("/api/membros", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: novoMembroNome,
          digitos: novoMembroCodigo,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Erro ao cadastrar membro.");
      }

      setMembroSucesso(`Membro ${result.membro.nome} cadastrado com sucesso!`);
      setNovoMembroNome("");
      setNovoMembroCodigo("");
      setModalMembroAberto(false);
      refrescarDashboard();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErro(err.message);
      } else {
        setErro("Erro ao cadastrar membro.");
      }
    } finally {
      setSalvandoMembro(false);
    }
  };

  const abrirEdicaoMembro = (membro: MembroRanking) => {
    setMembroEditando(membro);
    setEditMembroNome(membro.nome);
    setEditMembroErro(null);
  };

  const handleEditarMembro = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!membroEditando) return;
    setEditMembroErro(null);

    if (!editMembroNome.trim()) {
      setEditMembroErro("O nome do membro é obrigatório.");
      return;
    }

    setEditandoMembro(true);

    try {
      const response = await fetch(`/api/membros/${membroEditando.membro_id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: editMembroNome }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Erro ao editar membro.");
      }

      setMembroSucesso(`Membro editado com sucesso!`);
      setMembroEditando(null);
      refrescarDashboard();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setEditMembroErro(err.message);
      } else {
        setEditMembroErro("Erro ao editar membro.");
      }
    } finally {
      setEditandoMembro(false);
    }
  };

  const handleExcluirMembro = async (membro: MembroRanking) => {
    if (!window.confirm(`Excluir o membro "${membro.nome}"? Os links e os registos de indicação serão desvinculados.`)) {
      return;
    }

    setErro(null);
    setMembroSucesso(null);

    try {
      const response = await fetch(`/api/membros/${membro.membro_id}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Erro ao excluir membro.");
      }

      setMembroSucesso(`Membro "${membro.nome}" excluído com sucesso!`);
      refrescarDashboard();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErro(err.message);
      } else {
        setErro("Erro ao excluir membro.");
      }
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  if (carregando) {
    return (
      <div className="min-h-screen bg-neutral-100 flex flex-col items-center justify-center gap-3 text-neutral-600">
        <Loader2 className="w-8 h-8 animate-spin text-[#801818]" />
        <span className="text-xs font-medium">
          Carregando painel do Host...
        </span>
      </div>
    );
  }

  const membrosOpcoes =
    data?.membros.map((m) => ({ id: m.membro_id, nome: m.nome })) ?? [];

  return (
    <div className="min-h-screen bg-neutral-100 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* HEADER PADRÃO (IDÊNTICO AO DO MEMBRO) */}
        <DashboardHeader
          role="host"
          titulo="RifaGO - HOST"
          resumo="Visão geral das vendas e desempenho da equipa de membros,"
          nome={data?.evento.nome_evento}
          linkCopiado={copiadoHost}
          onCopiarLink={handleCopiarLinkHost}
          onLogout={handleLogout}
        >
          <button
            onClick={() => setModalMembroAberto(true)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2.5 rounded-2xl shadow flex items-center gap-2 transition-all active:scale-95"
          >
            <UserPlus className="w-4 h-4" />
            <span>Cadastrar Membro</span>
          </button>
        </DashboardHeader>

        {/* MENSAGEM DE ERRO OU SUCESSO GLOBAL */}
        {erro && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <span>{erro}</span>
          </div>
        )}

        {membroSucesso && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-4 rounded-2xl text-xs flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>{membroSucesso}</span>
          </div>
        )}

        {/* CARD DE DIVULGAÇÃO DO LINK DO HOST */}
        <div className="bg-gradient-to-r from-neutral-900 to-neutral-800 text-white p-5 rounded-3xl shadow-md border border-neutral-700 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-white text-xs font-extrabold uppercase tracking-wider">
                Link de Vendas Host
              </span>
            </div>
            <p className="text-xs text-white/70 font-semibold">
              Partilhe o seu link direto para atribuir as vendas realizadas
              diretamente ao Host.
            </p>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <input
              type="text"
              readOnly
              value={linkVendaHost}
              className="bg-neutral-950 border border-neutral-700 text-neutral-300 text-xs px-3 py-2.5 rounded-xl font-mono w-full md:w-72 select-all focus:outline-none"
            />
            <button
              onClick={handleCopiarLinkHost}
              className="bg-[#801818] hover:bg-[#661313] text-white p-2.5 rounded-xl transition-all shrink-0"
              title="Copiar Link"
            >
              {copiadoHost ? (
                <Check className="w-4 h-4 text-emerald-400" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
            <a
              href={linkVendaHost}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-neutral-800 hover:bg-neutral-700 text-neutral-300 p-2.5 rounded-xl transition-all shrink-0 border border-neutral-700"
              title="Abrir em nova aba"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>

        {/* GRID DE CARDS DE MÉTRICAS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Valor Arrecadado */}
          <div className="bg-white p-5 rounded-3xl border border-neutral-200 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider block">
                Total Arrecadado
              </span>
              <span className="text-xl font-extrabold text-neutral-900 mt-1 block">
                R${" "}
                {data?.resumo_geral.valor_total_arrecadado
                  .toFixed(2)
                  .replace(".", ",")}
              </span>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>

          {/* Card 2: Pontos Vendidos */}
          <div className="bg-white p-5 rounded-3xl border border-neutral-200 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider block">
                Pontos Vendidos
              </span>
              <span className="text-xl font-extrabold text-neutral-900 mt-1 block">
                {data?.resumo_geral.total_pontos_vendidos} /{" "}
                {data?.evento.limite_total_pontos}
              </span>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center">
              <Ticket className="w-5 h-5" />
            </div>
          </div>

          {/* Card 3: Vendas Diretas do Host */}
          <div className="bg-white p-5 rounded-3xl border border-neutral-200 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider block">
                Vendas Diretas Host
              </span>
              <span className="text-xl font-extrabold text-neutral-900 mt-1 block">
                {data?.vendas_diretas_host.quantidade} pts (R${" "}
                {data?.vendas_diretas_host.valor.toFixed(2).replace(".", ",")})
              </span>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>

          {/* Card 4: Membros Ativos */}
          <div className="bg-white p-5 rounded-3xl border border-neutral-200 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider block">
                Membros Cadastrados
              </span>
              <span className="text-xl font-extrabold text-neutral-900 mt-1 block">
                {data?.membros.length} membros
              </span>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-purple-50 border border-purple-200 text-purple-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* BARRA DE PROGRESSO DOS 1080 PONTOS */}
        <div className="bg-white p-6 rounded-3xl border border-neutral-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-neutral-700">
            <span>Progresso da Rifa</span>
            <span className="text-[#801818]">
              {data?.resumo_geral.porcentagem_concluida}% Concluído
            </span>
          </div>
          <div className="w-full bg-neutral-100 h-3.5 rounded-full overflow-hidden p-0.5 border border-neutral-200">
            <div
              className="bg-[#801818] h-full rounded-full transition-all duration-500"
              style={{ width: `${data?.resumo_geral.porcentagem_concluida}%` }}
            />
          </div>
          <div className="flex justify-between text-[11px] text-neutral-400">
            <span>0 pontos</span>
            <span>{data?.resumo_geral.pontos_restantes} pontos restantes</span>
            <span>1080 pontos</span>
          </div>
        </div>

        {/* TABELA DE DESEMPENHO DOS MEMBROS */}
        <div className="bg-white rounded-3xl border border-neutral-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-neutral-100 flex items-center justify-between">
            <h2 className="text-base font-bold text-neutral-900">
              Ranking & Vendas dos Membros
            </h2>
            <span className="text-xs text-neutral-400">
              {data?.membros.length} membros ativos
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 text-neutral-500 uppercase font-semibold border-b border-neutral-100">
                <tr>
                  <th className="px-6 py-4">Membro</th>
                  <th className="px-6 py-4">Código de Login</th>
                  <th className="px-6 py-4 text-center">Pontos Vendidos</th>
                  <th className="px-6 py-4 text-right">Valor Total</th>
                  <th className="px-6 py-4 text-center">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 text-neutral-800">
                {data?.membros.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="text-center py-8 text-neutral-400"
                    >
                      Nenhum membro cadastrado até o momento.
                    </td>
                  </tr>
                ) : (
                  data?.membros.map((membro) => (
                    <tr
                      key={membro.membro_id}
                      className="hover:bg-neutral-50/50 transition-colors"
                    >
                      <td className="px-6 py-4 font-bold text-neutral-900 flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-[#801818]/10 text-[#801818] flex items-center justify-center text-xs font-extrabold">
                          {membro.nome.charAt(0).toUpperCase()}
                        </div>
                        <span>{membro.nome}</span>
                      </td>
                      <td className="px-6 py-4 font-mono text-neutral-500">
                        {membro.codigo_login}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="bg-emerald-100 text-emerald-800 font-bold px-2.5 py-1 rounded-full text-[11px]">
                          {membro.pontos_vendidos} pts
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-extrabold text-neutral-900">
                        R${" "}
                        {membro.valor_arrecadado.toFixed(2).replace(".", ",")}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => {
                              const link = `${window.location.origin}/?ref=${membro.membro_id}`;
                              navigator.clipboard.writeText(link);
                              setMembroSucesso(
                                `Link de ${membro.nome} copiado!`,
                              );
                            }}
                            className="text-neutral-500 hover:text-[#801818] p-1.5 rounded-lg hover:bg-neutral-100 transition-all"
                            title="Copiar Link de Indicação"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => abrirEdicaoMembro(membro)}
                            className="text-neutral-500 hover:text-[#801818] p-1.5 rounded-lg hover:bg-neutral-100 transition-all"
                            title="Editar Membro"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleExcluirMembro(membro)}
                            className="text-neutral-500 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-all"
                            title="Excluir Membro"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* GRADE DE PONTOS (COM EDIÇÃO DE PONTOS PELO HOST) - ÚLTIMO DA TELA */}
        {data && (
          <GradePontos
            hostId={1}
            modo="host"
            membrosDisponiveis={membrosOpcoes}
            onVendasAlteradas={refrescarDashboard}
          />
        )}
      </div>

      {/* MODAL DE CADASTRAR NOVO MEMBRO */}
      {modalMembroAberto && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl border border-neutral-200">
            <h3 className="text-lg font-bold text-neutral-900">
              Cadastrar Novo Membro
            </h3>
            <p className="text-xs text-neutral-500 mt-1">
              Defina o nome e os 4 dígitos para o acesso do membro.
            </p>

            <form onSubmit={handleCadastrarMembro} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Nome do Membro
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: João Silva"
                  value={novoMembroNome}
                  onChange={(e) => setNovoMembroNome(e.target.value)}
                  className="w-full px-4 py-3 bg-neutral-50 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:border-[#801818]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  4 Dígitos do Login (Prefixo: 2024118ISINF)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={4}
                  required
                  placeholder="1234"
                  value={novoMembroCodigo}
                  onChange={(e) =>
                    setNovoMembroCodigo(e.target.value.replace(/\D/g, ""))
                  }
                  className="w-full px-4 py-3 bg-neutral-50 rounded-xl border border-neutral-200 text-sm font-mono tracking-widest focus:outline-none focus:border-[#801818]"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalMembroAberto(false)}
                  className="w-full bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold py-3 rounded-xl text-xs transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={salvandoMembro}
                  className="w-full bg-[#801818] hover:bg-[#661313] text-white font-bold py-3 rounded-xl shadow text-xs flex items-center justify-center gap-2 transition-all"
                >
                  {salvandoMembro ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Cadastrar"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE EDITAR MEMBRO */}
      {membroEditando && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl border border-neutral-200">
            <h3 className="text-lg font-bold text-neutral-900">
              Editar Membro
            </h3>
            <p className="text-xs text-neutral-500 mt-1">
              Código de login:{" "}
              <span className="font-mono font-bold">
                {membroEditando.codigo_login}
              </span>
            </p>

            {editMembroErro && (
              <div className="mt-3 bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                <span>{editMembroErro}</span>
              </div>
            )}

            <form onSubmit={handleEditarMembro} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Nome do Membro
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: João Silva"
                  value={editMembroNome}
                  onChange={(e) => setEditMembroNome(e.target.value)}
                  className="w-full px-4 py-3 bg-neutral-50 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:border-[#801818]"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setMembroEditando(null)}
                  className="w-full bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold py-3 rounded-xl text-xs transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={editandoMembro}
                  className="w-full bg-[#801818] hover:bg-[#661313] text-white font-bold py-3 rounded-xl shadow text-xs flex items-center justify-center gap-2 transition-all"
                >
                  {editandoMembro ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Salvar Alterações</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}