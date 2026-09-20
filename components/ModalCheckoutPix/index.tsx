"use client";

import React, { useState } from "react";
import {
  CheckCircle,
  AlertCircle,
  Loader2,
  X,
  Copy,
  QrCode,
} from "lucide-react";

const VALOR_POR_PONTO = 5.0;

interface ModalCheckoutPixProps {
  aberto: boolean;
  pontos: { id: number; numero_ponto: string }[];
  onFechar: () => void;
  onPagamentoConfirmado: () => void;
}

export function ModalCheckoutPix({
  aberto,
  pontos,
  onFechar,
  onPagamentoConfirmado,
}: ModalCheckoutPixProps) {
  const [processando, setProcessando] = useState(false);
  const [concluido, setConcluido] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

  if (!aberto || pontos.length === 0) return null;

  const valorTotal = pontos.length * VALOR_POR_PONTO;
  const pontosOrdenados = [...pontos]
    .map((p) => p.numero_ponto)
    .sort((a, b) => Number(a) - Number(b));

  // TODO: Substituir pelo payload real do Asaas quando integrado
  const pixPayload = `00020126580014BR.GOV.BCB.PIX0136rifago-exemplo@pix.com.br5204000053039865404${valorTotal.toFixed(2)}5802BR5913RIFA GO6009SAO PAULO62070503***6304`;
  const pixPayloadDisplay =
    "00020126580014BR.GOV.BCB.PIX... (preparar com Asaas)";

  const handleCopiarPix = async () => {
    try {
      await navigator.clipboard.writeText(pixPayload);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      setErro("Não foi possível copiar o código Pix.");
    }
  };

  const handleConfirmarPagamento = async () => {
    setProcessando(true);
    setErro(null);

    try {
      const response = await fetch("/api/pontos/pagamento/confirmar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ponto_ids: pontos.map((p) => p.id),
          forma_pagamento: "pix",
          valor_total: valorTotal,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao confirmar pagamento.");
      }

      setConcluido(true);
      onPagamentoConfirmado();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErro(err.message);
      } else {
        setErro("Erro inesperado ao processar pagamento.");
      }
    } finally {
      setProcessando(false);
    }
  };

  const handleFechar = () => {
    setConcluido(false);
    setErro(null);
    setCopiado(false);
    onFechar();
  };

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

            {/* QR Code placeholder — será substituído pelo QR do Asaas */}
            <div className="bg-neutral-100 border-2 border-dashed border-neutral-300 rounded-2xl p-8 mb-5 flex flex-col items-center justify-center">
              <QrCode className="w-24 h-24 text-neutral-300 mb-3" />
              <span className="text-xs text-neutral-400 text-center">
                QR Code do Pix será exibido aqui
                <br />
                (integração Asaas pendente)
              </span>
            </div>

            {/* Código Pix Copia e Cola */}
            <div className="mb-5">
              <label className="block text-xs font-semibold text-neutral-700 mb-1.5">
                Pix Copia e Cola
              </label>
              <div className="flex items-stretch gap-2">
                <div className="flex-1 bg-neutral-50 border border-neutral-200 rounded-xl px-3 py-2.5 text-[10px] font-mono text-neutral-500 break-all leading-relaxed overflow-hidden">
                  {pixPayloadDisplay}
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

            {erro && (
              <div className="mb-4 flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                <span>{erro}</span>
              </div>
            )}

            <button
              type="button"
              onClick={handleConfirmarPagamento}
              disabled={processando}
              className="w-full bg-[#801818] hover:bg-[#661313] disabled:bg-neutral-300 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg flex items-center justify-center gap-2 text-sm transition-all"
            >
              {processando ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processando...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  <span>Confirmar Pagamento Pix</span>
                </>
              )}
            </button>
          </>
        )}
      </div>
    </div>
  );
}