"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Header } from "@/components/Header";
import { GradePontos } from "@/components/GradePontos/GradePontos";

function HomeContent() {
  const searchParams = useSearchParams();

  // Pega o ID do membro caso venha por um link de indicação (?ref=12)
  const ref = searchParams.get("ref");
  const membroIndicadorId = ref ? Number(ref) : null;

  // ID do Host/Evento principal cadastrado no seu banco de dados
  const HOST_ID = 1;

  return (
    <section className="w-full flex justify-center items-center bg-neutral-100 min-h-screen">
      <div className="w-[95%] max-w-6xl flex flex-col items-center">
        <Header indicadorNome={undefined} />
        <main className="w-full mt-4">
          <GradePontos hostId={HOST_ID} membroIndicadorId={membroIndicadorId} />
        </main>
      </div>
    </section>
  );
}

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="w-full min-h-screen flex items-center justify-center bg-neutral-100">
          <span className="text-xs font-medium text-neutral-500">
            Carregando rifa...
          </span>
        </div>
      }
    >
      <HomeContent />
    </Suspense>
  );
}