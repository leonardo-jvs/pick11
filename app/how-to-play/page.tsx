"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Screen } from "@/components/layout/Screen";
import { Card } from "@/components/ui/Card";
import { ROUTES } from "@/constants/routes";

const STEPS = [
  { title: "Monte sua sala", text: "Crie ou entre em uma sala multiplayer, de 2 a 20 jogadores." },
  { title: "Draft por rodadas", text: "Escolha jogadores em turnos alternados (snake draft) até montar seu elenco." },
  { title: "Defina sua tática", text: "Escolha formação e estilo de jogo — isso afeta a compatibilidade do time." },
  { title: "Ispute a liga", text: "38 rodadas, turno e returno, contra os outros clubes." },
];

export default function HowToPlayPage() {
  const router = useRouter();
  return (
    <Screen>
      <button
        onClick={() => router.back()}
        className="mb-6 flex items-center gap-1.5 font-sans text-xs text-text-tertiary transition-colors hover:text-text-primary"
      >
        <ArrowLeft size={14} />
        Voltar
      </button>
      <h1 className="mb-1 font-display text-3xl tracking-wide text-text-primary">COMO JOGAR</h1>
      <p className="mb-6 font-sans text-sm text-text-tertiary">O essencial em 4 passos</p>

      <div className="flex flex-col gap-3">
        {STEPS.map((step, i) => (
          <Card key={step.title} className="flex items-start gap-4">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gold/15 font-mono text-sm font-semibold text-gold">
              {i + 1}
            </span>
            <div>
              <h3 className="font-sans text-sm font-semibold text-text-primary">{step.title}</h3>
              <p className="font-sans text-xs text-text-tertiary">{step.text}</p>
            </div>
          </Card>
        ))}
      </div>

      <p className="mt-6 text-center font-sans text-xs text-text-tertiary">
        Tutorial visual completo chega numa etapa futura.
      </p>
      <div className="mt-4">
        <button onClick={() => router.push(ROUTES.menu)} className="w-full text-center font-sans text-sm text-gold">
          Voltar ao menu
        </button>
      </div>
    </Screen>
  );
}
