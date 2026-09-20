"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  Search,
  CheckCircle,
  AlertCircle,
  Loader2,
  ArrowRight,
  X,
  Pencil,
  Trash2,
  Save,
  Users,
} from "lucide-react";
import { ModalCheckoutPix } from "@/components/ModalCheckoutPix";

const TOTAL_PONTOS = 1080;
const VALOR_POR_PONTO = 5.0;

export type ModoGrade = "cliente" | "member" | "host";

interface PontoDetalhe {
  id: number;
  numero_ponto: string;
  status: string;
  nome_comprador: string | null;
  telefone_comprador: string | null;
  membro_indicador_id: number | null;
}

export interface MembroOpcao {
  id: number;
  nome: string;
}

interface PaginaPontos {
  hostId: number;
  modo?: ModoGrade;
  membroIndicadorId?: number | null;
  membrosDisponiveis?: MembroOpcao[];
  onVendasAlteradas?: () => void;
}

export function GradePontos({
  hostId,
  modo = "cliente",
  membroIndicadorId,
  membrosDisponiveis = [],
  onVendasAlteradas,
}: PaginaPontos) {
  const [pontosOcupados, setPontosOcupados] = useState<
    Record<string, PontoDetalhe>
  >({});
  const [pesquisa, setPesquisa] = useState("");
  const [selecionados, setSelecionados] = useState<number[]>([]);
  const [carregandoPontos, setCarregandoPontos] = useState(true);

  // Estado do Modal de Registo/Registrar Venda
  const [modalAberto, setModalAberto] = useState(false);
  const [nomeComprador, setNomeComprador] = useState("");
  const [telefoneComprador, setTelefoneComprador] = useState("");
  const [cpfComprador, setCpfComprador] = useState("");
  const [indicadorSelecionado, setIndicadorSelecionado] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);

  // Estado do Modal de Pagamento Pix
  const [pontosReservados, setPontosReservados] = useState<
    { id: number; numero_ponto: string }[] | null
  >(null);
  const [modalPagamentoAberto, setModalPagamentoAberto] = useState(false);

  // Estado do Modal de Edição de Ponto (apenas Host)
  const [pontoEditando, setPontoEditando] = useState<PontoDetalhe | null>(null);
  const [editNomeComprador, setEditNomeComprador] = useState("");
  const [editTelefoneComprador, setEditTelefoneComprador] = useState("");
  const [editIndicador, setEditIndicador] = useState("");
  const [editandoPonto, setEditandoPonto] = useState(false);
  const [editErro, setEditErro] = useState<string | null>(null);

  const isModoGestao = modo === "member" || modo === "host";
  const isHost = modo === "host";

  const urlPontos = `/api/pontos/disponiveis?host_id=${hostId}`;

  const aplicarMapaPontos = (dados: { pontos?: PontoDetalhe[] }) => {
    const mapa: Record<string, PontoDetalhe> = {};
    dados.pontos?.forEach((p) => {
      mapa[p.numero_ponto] = p;
    });
    setPontosOcupados(mapa);
  };

  useEffect(() => {
    let ativo = true;

    fetch(urlPontos)
      .then(async (response) => {
        const data = await response.json();
        return { ok: response.ok, data };
      })
      .then(({ ok, data }) => {
        if (ativo && ok && data.pontos) {
          aplicarMapaPontos(data);
        }
      })
      .catch((err) => {
        console.error("Erro ao carregar pontos:", err);
      })
      .finally(() => {
        if (ativo) setCarregandoPontos(false);
      });

    return () => {
      ativo = false;
    };
  }, [urlPontos]);

  const refrescarPontos = () => {
    setCarregandoPontos(true);
    fetch(urlPontos)
      .then(async (response) => {
        const data = await response.json();
        return { ok: response.ok, data };
      })
      .then(({ ok, data }) => {
        if (ok && data.pontos) aplicarMapaPontos(data);
      })
      .catch((err) => {
        console.error("Erro ao recarregar pontos:", err);
      })
      .finally(() => setCarregandoPontos(false));
  };

  const listaPontos = useMemo(() => {
    const todos = Array.from({ length: TOTAL_PONTOS }, (_, i) => i + 1);
    if (!pesquisa.trim()) return todos;

    return todos.filter((num) => num.toString().includes(pesquisa.trim()));
  }, [pesquisa]);

  const togglePonto = (numero: number) => {
    const ocupado = pontosOcupados[numero.toString()];

    if (ocupado) {
      if (isHost) {
        abrirEdicaoPonto(ocupado);
      }
      return;
    }

    setSelecionados((prev) =>
      prev.includes(numero)
        ? prev.filter((n) => n !== numero)
        : [...prev, numero],
    );
  };

  const abrirEdicaoPonto = (ponto: PontoDetalhe) => {
    setPontoEditando(ponto);
    setEditNomeComprador(ponto.nome_comprador ?? "");
    setEditTelefoneComprador(ponto.telefone_comprador ?? "");
    setEditIndicador(
      ponto.membro_indicador_id ? String(ponto.membro_indicador_id) : "",
    );
    setEditErro(null);
  };

  const fecharModalRegistro = () => {
    setModalAberto(false);
    setErro(null);
  };

  const limparFormularioComprador = () => {
    setNomeComprador("");
    setTelefoneComprador("");
    setCpfComprador("");
    setIndicadorSelecionado("");
  };

  const valorTotal = selecionados.length * VALOR_POR_PONTO;

  const handleFinalizar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    setSucesso(null);

    if (!nomeComprador || !telefoneComprador) {
      setErro("Por favor, preencha o nome e o telefone do comprador.");
      return;
    }

    const cpfLimpo = cpfComprador.replace(/\D/g, "");

    if (modo === "cliente" && cpfLimpo.length !== 11) {
      setErro("Por favor, informe um CPF válido com 11 dígitos.");
      return;
    }

    setEnviando(true);

    try {
      let response: Response;

      if (modo === "cliente") {
        response = await fetch("/api/pontos/comprar-publico", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            host_id: hostId,
            numeros_pontos: selecionados,
            nome_comprador: nomeComprador,
            telefone_comprador: telefoneComprador,
            cpf_comprador: cpfLimpo,
            membro_indicador_id: membroIndicadorId || null,
          }),
        });
      } else {
        response = await fetch("/api/pontos/registrar-membro", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            host_id: hostId,
            numeros_pontos: selecionados,
            nome_comprador: nomeComprador,
            telefone_comprador: telefoneComprador,
            status_pago: true,
            membro_indicador_id:
              isHost && indicadorSelecionado
                ? Number(indicadorSelecionado)
                : null,
          }),
        });
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao registrar os pontos.");
      }

      if (modo === "cliente") {
        setPontosReservados(data.pontos);
        fecharModalRegistro();
        setModalPagamentoAberto(true);
      } else {
        setSucesso(
          `Venda registrada para os pontos ${selecionados.join(", ")}!`,
        );
        fecharModalRegistro();
        limparFormularioComprador();
        setSelecionados([]);
        refrescarPontos();
        onVendasAlteradas?.();
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErro(err.message);
      } else {
        setErro("Erro inesperado ao registrar os pontos.");
      }
    } finally {
      setEnviando(false);
    }
  };

  const handleSalvarEdicao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pontoEditando) return;
    setEditErro(null);
    setEditandoPonto(true);

    try {
      const response = await fetch(`/api/pontos/${pontoEditando.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome_comprador: editNomeComprador,
          telefone_comprador: editTelefoneComprador,
          membro_indicador_id: editIndicador ? Number(editIndicador) : null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao atualizar o ponto.");
      }

      setPontoEditando(null);
      refrescarPontos();
      onVendasAlteradas?.();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setEditErro(err.message);
      } else {
        setEditErro("Erro ao atualizar o ponto.");
      }
    } finally {
      setEditandoPonto(false);
    }
  };

  const handleRemoverPonto = async () => {
    if (!pontoEditando) return;
    setEditErro(null);

    if (!window.confirm(`Remover o ponto ${pontoEditando.numero_ponto}?`)) {
      return;
    }

    setEditandoPonto(true);

    try {
      const response = await fetch(`/api/pontos/${pontoEditando.id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao remover o ponto.");
      }

      setPontoEditando(null);
      refrescarPontos();
      onVendasAlteradas?.();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setEditErro(err.message);
      } else {
        setEditErro("Erro ao remover o ponto.");
      }
    } finally {
      setEditandoPonto(false);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6 pb-32">
      {/* BARRA DE PESQUISA */}
      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
        <input
          type="text"
          placeholder="Pesquisar número do ponto (ex: 42, 500, 1080)..."
          value={pesquisa}
          onChange={(e) => setPesquisa(e.target.value)}
          className="w-full pl-12 pr-4 py-3.5 bg-white rounded-2xl border border-neutral-200 text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:border-[#801818] shadow-sm transition-all"
        />
        {pesquisa && (
          <button
            onClick={() => setPesquisa("")}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-neutral-400 hover:text-neutral-600 bg-neutral-100 p-1 rounded-full"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Legenda dos Status */}
      <div className="flex flex-wrap items-center justify-center gap-4 mb-6 text-xs text-neutral-600">
        <div className="flex items-center gap-1.5">
          <div className="w-3.5 h-3.5 rounded-full bg-[#801818]" />
          <span>Disponível</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3.5 h-3.5 rounded-full bg-emerald-600" />
          <span>Selecionado</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3.5 h-3.5 rounded-full bg-neutral-300 border border-neutral-400" />
          <span>Já Comprado / Ocupado</span>
        </div>
        {isHost && (
          <div className="flex items-center gap-1.5">
            <Pencil className="w-3.5 h-3.5 text-[#801818]" />
            <span>Clique num ponto ocupado para editar</span>
          </div>
        )}
      </div>

      {/* FEEDBACK */}
      {erro && (
        <div className="mb-4 flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 p-3 rounded-2xl text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
          <span>{erro}</span>
        </div>
      )}
      {sucesso && (
        <div className="mb-4 flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 p-3 rounded-2xl text-xs">
          <CheckCircle className="w-4 h-4 shrink-0 text-emerald-500" />
          <span>{sucesso}</span>
        </div>
      )}

      {/* GRADE DOS PONTOS */}
      {carregandoPontos ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-neutral-500">
          <Loader2 className="w-8 h-8 animate-spin text-[#801818]" />
          <span className="text-xs">Carregando mapa de pontos...</span>
        </div>
      ) : (
        <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-2.5">
          {listaPontos.map((numero) => {
            const ocupado = pontosOcupados[numero.toString()];
            const estaSelecionado = selecionados.includes(numero);

            return (
              <button
                key={numero}
                onClick={() => togglePonto(numero)}
                disabled={!!ocupado && !isHost}
                title={
                  ocupado && isHost
                    ? "Clique para editar este ponto"
                    : undefined
                }
                className={`
                  aspect-square rounded-full flex items-center justify-center text-xs font-bold transition-all transform active:scale-95 select-none
                  ${
                    ocupado
                      ? isHost
                        ? "bg-neutral-200 text-neutral-400 border border-neutral-300 opacity-60 hover:opacity-100 hover:border-[#801818] hover:text-[#801818] cursor-pointer"
                        : "bg-neutral-200 text-neutral-400 border border-neutral-300 cursor-not-allowed line-through opacity-60"
                      : estaSelecionado
                        ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 scale-105 border-2 border-emerald-400"
                        : "bg-[#801818] text-white font-bold hover:border-white hover:text-white shadow-sm"
                  }
                `}
              >
                {numero}
              </button>
            );
          })}
        </div>
      )}

      {/* BARRA INFERIOR DE REGISTO */}
      {selecionados.length > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[92%] max-w-xl bg-white text-black p-4 rounded-3xl shadow-2xl flex items-center justify-between z-40 border border-neutral-200 animate-slideUp">
          <div>
            <span className="text-xs text-neutral-600 font-semibold block">
              {selecionados.length}{" "}
              {selecionados.length === 1
                ? "ponto selecionado"
                : "pontos selecionados"}
            </span>
            <span className="text-lg font-extrabold text-emerald-600">
              Total: R$ {valorTotal.toFixed(2).replace(".", ",")}
            </span>
          </div>

          <button
            onClick={() => {
              setErro(null);
              setSucesso(null);
              setModalAberto(true);
            }}
            className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold px-5 py-3 rounded-2xl shadow-md flex items-center gap-2 transition-all active:scale-95"
          >
            <span>{isModoGestao ? "Registrar Venda" : "Registar Pontos"}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* MODAL / FORMULÁRIO DE REGISTAR VENDA */}
      {modalAberto && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn">
          <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl border border-neutral-200 relative animate-slideUp">
            <button
              onClick={fecharModalRegistro}
              className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-600 p-1 rounded-full bg-neutral-100"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-5">
              <h3 className="text-lg font-bold text-neutral-900">
                {isModoGestao ? "Registrar Venda" : "Finalizar Registo"}
              </h3>
              <p className="text-xs text-neutral-500 mt-1">
                {isModoGestao
                  ? "Informe os dados do comprador para confirmar a venda."
                  : "Informe os seus dados para reservar os seus pontos."}
              </p>
            </div>

            <div className="bg-neutral-50 p-3.5 rounded-2xl border border-neutral-200 mb-5 flex items-center justify-between">
              <div>
                <span className="text-xs text-neutral-500 block">
                  Pontos escolhidos:
                </span>
                <span className="text-xs font-mono font-bold text-neutral-800 break-all">
                  {[...selecionados].sort((a, b) => a - b).join(", ")}
                </span>
              </div>
              <div className="text-right shrink-0">
                <span className="text-xs text-neutral-500 block">Total:</span>
                <span className="text-sm font-extrabold text-emerald-600">
                  R$ {valorTotal.toFixed(2).replace(".", ",")}
                </span>
              </div>
            </div>

            <form onSubmit={handleFinalizar} className="space-y-4">
              {erro && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                  <span>{erro}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Nome do Comprador
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Maria Silva"
                  value={nomeComprador}
                  onChange={(e) => setNomeComprador(e.target.value)}
                  className="w-full px-4 py-3 bg-neutral-50 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:border-[#801818]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Telefone / WhatsApp
                </label>
                <input
                  type="tel"
                  required
                  placeholder="(00) 00000-0000"
                  value={telefoneComprador}
                  onChange={(e) => setTelefoneComprador(e.target.value)}
                  className="w-full px-4 py-3 bg-neutral-50 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:border-[#801818]"
                />
              </div>

              {modo === "cliente" && (
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    CPF
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={14}
                    placeholder="000.000.000-00"
                    value={cpfComprador}
                    onChange={(e) => {
                      const v = e.target.value.replace(/\D/g, "").slice(0, 11);
                      const formatado = v
                        .replace(/(\d{3})(\d)/, "$1.$2")
                        .replace(/(\d{3})(\d)/, "$1.$2")
                        .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
                      setCpfComprador(formatado);
                    }}
                    className="w-full px-4 py-3 bg-neutral-50 rounded-xl border border-neutral-200 text-sm font-mono focus:outline-none focus:border-[#801818]"
                  />
                </div>
              )}

              {isHost && (
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1 flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-neutral-400" />
                    Atribuir a um Membro (opcional)
                  </label>
                  <select
                    value={indicadorSelecionado}
                    onChange={(e) => setIndicadorSelecionado(e.target.value)}
                    className="w-full px-4 py-3 bg-neutral-50 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:border-[#801818]"
                  >
                    <option value="">Venda direta do Host</option>
                    {membrosDisponiveis.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.nome}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <button
                type="submit"
                disabled={enviando}
                className="w-full bg-[#801818] hover:bg-[#661313] disabled:bg-neutral-300 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg flex items-center justify-center gap-2 text-sm transition-all mt-2"
              >
                {enviando ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processando...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    <span>
                      {isModoGestao ? "Registrar Venda" : "Ir para o Pagamento"}
                    </span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE EDIÇÃO DE PONTO (HOST) */}
      {pontoEditando && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn">
          <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl border border-neutral-200 relative animate-slideUp">
            <button
              onClick={() => setPontoEditando(null)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-600 p-1 rounded-full bg-neutral-100"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-5">
              <div className="flex items-center gap-2">
                <span className="bg-neutral-100 text-neutral-700 font-mono font-extrabold text-xs px-2.5 py-1 rounded-lg">
                  Ponto {pontoEditando.numero_ponto}
                </span>
                <span className="bg-emerald-100 text-emerald-800 font-bold text-[10px] px-2 py-0.5 rounded-full uppercase">
                  {pontoEditando.status === "pago" ? "Pago" : "Pendente"}
                </span>
              </div>
              <h3 className="text-lg font-bold text-neutral-900 mt-2">
                Editar Ponto
              </h3>
              <p className="text-xs text-neutral-500 mt-1">
                Edite os dados do comprador ou remova este ponto.
              </p>
            </div>

            {editErro && (
              <div className="mb-4 flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                <span>{editErro}</span>
              </div>
            )}

            <form onSubmit={handleSalvarEdicao} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Nome do Comprador
                </label>
                <input
                  type="text"
                  value={editNomeComprador}
                  onChange={(e) => setEditNomeComprador(e.target.value)}
                  placeholder="Ex: Maria Silva"
                  className="w-full px-4 py-3 bg-neutral-50 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:border-[#801818]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1">
                  Telefone / WhatsApp
                </label>
                <input
                  type="tel"
                  value={editTelefoneComprador}
                  onChange={(e) => setEditTelefoneComprador(e.target.value)}
                  placeholder="(00) 00000-0000"
                  className="w-full px-4 py-3 bg-neutral-50 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:border-[#801818]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 mb-1 flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-neutral-400" />
                  Quem indicou / Vínculo
                </label>
                <select
                  value={editIndicador}
                  onChange={(e) => setEditIndicador(e.target.value)}
                  className="w-full px-4 py-3 bg-neutral-50 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:border-[#801818]"
                >
                  <option value="">Nenhum (venda direta do Host)</option>
                  {membrosDisponiveis.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleRemoverPonto}
                  disabled={editandoPonto}
                  className="w-full bg-red-50 hover:bg-red-100 text-red-700 font-bold py-3 rounded-xl text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  {editandoPonto ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                  <span>Remover Ponto</span>
                </button>
              </div>

              <button
                type="submit"
                disabled={editandoPonto}
                className="w-full bg-[#801818] hover:bg-[#661313] disabled:bg-neutral-300 text-white font-bold py-3 rounded-xl shadow text-xs flex items-center justify-center gap-2 transition-all"
              >
                {editandoPonto ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>Salvar Alterações</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE PAGAMENTO PIX */}
      <ModalCheckoutPix
        aberto={modalPagamentoAberto}
        pontos={pontosReservados ?? []}
        compradorNome={nomeComprador}
        compradorCpf={cpfComprador}
        compradorTelefone={telefoneComprador}
        onFechar={() => {
          setModalPagamentoAberto(false);
          setPontosReservados(null);
        }}
        onPagamentoConfirmado={() => {
          setSelecionados([]);
          fecharModalRegistro();
          limparFormularioComprador();
          refrescarPontos();
          onVendasAlteradas?.();
        }}
      />
    </div>
  );
}
