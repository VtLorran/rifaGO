"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  CheckCircle,
  AlertCircle,
  Loader2,
  X,
  Copy,
  QrCode,
  Clock,
} from "lucide-react";

const VALOR_POR_PONTO = 5.0;

interface ModalCheckoutPixProps {
  aberto: boolean;
  pontos: { id: number; numero_ponto: string }[];
  compradorNome?: string;
  compradorCpf?: string;
  compradorTelefone?: string;
  onFechar: () => void;
  onPagamentoConfirmado: () => void;
}

interface PixData {
  pagamento_id: string;
  pix_copia_cola: string;
  qr_code_base64: string;
  expiracao: string;
}

export function ModalCheckoutPix({
  aberto,
  pontos,
  compradorNome,
  compradorCpf,
  compradorTelefone,
  onFechar,
  onPagamentoConfirmado,
}: ModalCheckoutPixProps) {
  const [carregandoPix, setCarregandoPix] = useState(false);
  const [pixData, setPixData] = useState<PixData | null>(null);
  const [concluido, setConcluido] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);
  const [aguardandoPagamento, setAguardandoPagamento] = useState(false);
  const [tempoRestante, setTempoRestante] = useState<number | null>(null);

  const intervaloRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);

  const valorTotal = pontos.length * VALOR_POR_PONTO;
  const pontosOrdenados = [...pontos]
    .map((p) => p.numero_ponto)
    .sort((a, b) => Number(a) - Number(b));

  const limparIntervalo = useCallback(() => {
    if (intervaloRef.current) {
      clearInterval(intervaloRef.current);
      intervaloRef.current = null;
    }
  }, []);

  const verificarStatus = useCallback(
    async (pontoId: number) => {
      try {
        const response = await fetch(`/api/pontos/status?id=${pontoId}`);
        const data = await response.json();

        if (data.status === "pago") {
          limparIntervalo();
          if (mountedRef.current) {
            setConcluido(true);
            setAguardandoPagamento(false);
            onPagamentoConfirmado();
          }
        }
      } catch {
        // Erro silencioso no polling — tenta novamente no próximo ciclo
      }
    },
    [limparIntervalo, onPagamentoConfirmado],
  );

  const iniciarPolling = useCallback(
    (pontoId: number) => {
      limparIntervalo();
      setAguardandoPagamento(true);
      intervaloRef.current = setInterval(() => {
        verificarStatus(pontoId);
      }, 3000);
    },
    [limparIntervalo, verificarStatus],
  );

  // Gerar Pix ao abrir o modal
  useEffect(() => {
    if (!aberto || pontos.length === 0) return;

    mountedRef.current = true;

    const primeiroPonto = pontos[0];

    const gerarPix = async () => {
      setCarregandoPix(true);
      try {
        const response = await fetch("/api/pagamento/pix", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ponto_id: primeiroPonto.id,
            valor: valorTotal,
            comprador_nome: compradorNome || "Cliente RifaGO",
            comprador_cpf: compradorCpf || "00000000000",
            comprador_telefone: compradorTelefone || "",
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Erro ao gerar código Pix.");
        }

        if (mountedRef.current) {
          setPixData(data);

          // Calcular tempo restante até expiração
          if (data.expiracao) {
            const expiracaoMs = new Date(data.expiracao).getTime();
            const agora = Date.now();
            const diff = Math.max(0, Math.floor((expiracaoMs - agora) / 1000));
            setTempoRestante(diff);
          }

          // Iniciar polling para o primeiro ponto
          iniciarPolling(primeiroPonto.id);
        }
      } catch (err: unknown) {
        if (mountedRef.current) {
          if (err instanceof Error) {
            setErro(err.message);
          } else {
            setErro("Erro ao gerar código Pix.");
          }
        }
      } finally {
        if (mountedRef.current) {
          setCarregandoPix(false);
        }
      }
    };

    gerarPix();

    return () => {
      mountedRef.current = false;
      limparIntervalo();
    };
  }, [
    aberto,
    pontos,
    compradorNome,
    compradorCpf,
    compradorTelefone,
    valorTotal,
    iniciarPolling,
    limparIntervalo,
  ]);

  // Timer de contagem regressiva
  useEffect(() => {
    if (tempoRestante === null || tempoRestante <= 0) return;

    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    timerRef.current = setInterval(() => {
      setTempoRestante((prev) => {
        if (prev === null || prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [tempoRestante]);

  const formatarTempo = (segundos: number) => {
    const min = Math.floor(segundos / 60);
    const seg = segundos % 60;
    return `${min.toString().padStart(2, "0")}:${seg.toString().padStart(2, "0")}`;
  };

  const handleCopiarPix = async () => {
    if (!pixData?.pix_copia_cola) return;
    try {
      await navigator.clipboard.writeText(pixData.pix_copia_cola);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      setErro("Não foi possível copiar o código Pix.");
    }
  };

  const handleFechar = async () => {
    limparIntervalo();
    if (timerRef.current) clearInterval(timerRef.current);

    // Se não concluiu pagamento, cancela os pontos pendentes
    if (!concluido && pontos.length > 0) {
      try {
        await fetch("/api/pontos/cancelar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ponto_ids: pontos.map((p) => p.id),
          }),
        });
      } catch {
        // Erro silencioso — pontos pendentes ficam para limpeza manual
      }
    }

    setConcluido(false);
    setErro(null);
    setCopiado(false);
    setPixData(null);
    setAguardandoPagamento(false);
    setTempoRestante(null);
    onFechar();
  };

  if (!aberto || pontos.length === 0) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn">
      <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl border border-neutral-200 relative animate-slideUp">
        <button
          onClick={handleFechar}
          className="absolute top-4 right-4 text-neutral-400 hover:text-neutral-600 p-1 rounded-full bg-neutral-100"
        >
          <X className="w-5 h-5" />
        </button>

        {concluido ? (
          <div className="text-center py-6">
            <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-neutral-900">
              Pagamento Confirmado!
            </h3>
            <p className="text-sm text-neutral-500 mt-2">
              Os seus pontos foram pagos com sucesso via Pix.
            </p>
            <button
              onClick={handleFechar}
              className="mt-6 bg-[#801818] hover:bg-[#661313] text-white font-bold py-3 px-8 rounded-xl text-sm transition-all"
            >
              Fechar
            </button>
          </div>
        ) : (
          <>
            <div className="mb-5">
              <h3 className="text-lg font-bold text-neutral-900 flex items-center gap-2">
                <QrCode className="w-5 h-5 text-[#801818]" />
                Pagamento via Pix
              </h3>
              <p className="text-xs text-neutral-500 mt-1">
                Escaneie o QR Code ou copie o código abaixo para pagar.
              </p>
            </div>

            {/* Resumo dos pontos */}
            <div className="bg-neutral-50 p-3.5 rounded-2xl border border-neutral-200 mb-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-neutral-500">
                  Pontos reservados:
                </span>
                <span className="text-xs font-mono font-bold text-neutral-800">
                  {pontosOrdenados.join(", ")}
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-neutral-200 pt-2">
                <span className="text-xs font-semibold text-neutral-700">
                  Total a pagar:
                </span>
                <span className="text-lg font-extrabold text-emerald-600">
                  R$ {valorTotal.toFixed(2).replace(".", ",")}
                </span>
              </div>
            </div>

            {/* QR Code */}
            {carregandoPix ? (
              <div className="bg-neutral-100 border-2 border-dashed border-neutral-300 rounded-2xl p-8 mb-5 flex flex-col items-center justify-center">
                <Loader2 className="w-12 h-12 text-[#801818] animate-spin mb-3" />
                <span className="text-xs text-neutral-500">
                  Gerando código Pix...
                </span>
              </div>
            ) : pixData?.qr_code_base64 ? (
              <div className="bg-white border border-neutral-200 rounded-2xl p-4 mb-5 flex flex-col items-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`data:image/png;base64,${pixData.qr_code_base64}`}
                  alt="QR Code Pix"
                  className="w-48 h-48"
                />
              </div>
            ) : (
              <div className="bg-neutral-100 border-2 border-dashed border-neutral-300 rounded-2xl p-8 mb-5 flex flex-col items-center justify-center">
                <QrCode className="w-24 h-24 text-neutral-300 mb-3" />
                <span className="text-xs text-neutral-400 text-center">
                  Não foi possível gerar o QR Code
                </span>
              </div>
            )}

            {/* Código Pix Copia e Cola */}
            {pixData?.pix_copia_cola && (
              <div className="mb-5">
                <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                  Pix Copia e Cola
                </label>
                <div className="flex items-stretch gap-2">
                  <div className="flex-1 bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2.5 text-[10px] font-mono text-neutral-500 break-all leading-relaxed overflow-hidden max-h-20">
                    {pixData.pix_copia_cola}
                  </div>
                  <button
                    onClick={handleCopiarPix}
                    className="bg-[#801818] hover:bg-[#661313] text-white px-3 rounded-xl transition-all shrink-0 flex items-center justify-center"
                    title="Copiar código Pix"
                  >
                    {copiado ? (
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Timer de expiração */}
            {tempoRestante !== null && tempoRestante > 0 && (
              <div className="mb-4 flex items-center justify-center gap-2 text-xs text-neutral-500">
                <Clock className="w-3.5 h-3.5" />
                <span>
                  Expira em{" "}
                  <strong className="text-neutral-700">
                    {formatarTempo(tempoRestante)}
                  </strong>
                </span>
              </div>
            )}

            {/* Status do polling */}
            {aguardandoPagamento && (
              <div className="mb-4 flex items-center justify-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 p-3 rounded-xl text-xs">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Aguardando confirmação do pagamento...</span>
              </div>
            )}

            {erro && (
              <div className="mb-4 flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                <span>{erro}</span>
              </div>
            )}

            {/* Botão de copiar (atalho) */}
            {pixData?.pix_copia_cola && (
              <button
                type="button"
                onClick={handleCopiarPix}
                disabled={aguardandoPagamento}
                className="w-full bg-[#801818] hover:bg-[#661313] disabled:bg-neutral-300 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg flex items-center justify-center gap-2 text-sm transition-all"
              >
                {copiado ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    <span>Código Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copiar Código Pix</span>
                  </>
                )}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
