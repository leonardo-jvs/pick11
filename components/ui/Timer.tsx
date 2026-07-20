"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export interface TimerProps {
  seconds: number;
  onComplete?: () => void;
  /** Largura da barra em px (mantém o nome "size" pra não precisar mudar quem já usa o componente) */
  size?: number;
  paused?: boolean;
  /** Muda a key para reiniciar o timer (ex: nova rodada do draft) */
  resetKey?: string | number;
  className?: string;
  label?: string;
}

/**
 * Barra de tempo — 100% CSS, sem nenhum `setInterval`/`Date.now()` calculando
 * um número a cada tick. A barra some (de verde a vermelho) sozinha, via uma
 * única animação CSS nativa do navegador, e `onComplete` é disparado por um
 * único `setTimeout` agendado exatamente para o fim da contagem.
 *
 * Por que a troca: a versão anterior (numérica, com polling via setInterval)
 * apresentava bugs visuais intermitentes e difíceis de reproduzir (números
 * como "249" aparecendo do nada) — sintoma clássico de estado calculado
 * repetidamente em JS divergindo do relógio real. Removendo esse cálculo
 * repetido inteiramente (a barra não tem nenhum número pra "errar", e o
 * disparo do fim de tempo é um único agendamento, não um polling) elimina
 * essa classe inteira de bug pela raiz, não só sintomaticamente.
 */
export function Timer({ seconds, onComplete, size = 160, paused = false, resetKey, className, label }: TimerProps) {
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  // Um ÚNICO agendamento por rodada — nunca um polling. O navegador dispara
  // isso sozinho, exatamente na hora certa; não há como "acumular deriva" ao
  // longo do tempo porque não existe nenhum recálculo repetido acontecendo.
  useEffect(() => {
    if (paused || seconds <= 0) return;
    const id = setTimeout(() => onCompleteRef.current?.(), seconds * 1000);
    return () => clearTimeout(id);
  }, [seconds, resetKey, paused]);

  const isPaused = paused || seconds <= 0;

  return (
    <div className={cn("flex flex-col items-center gap-1.5", className)} style={{ width: size }}>
      <div className="h-2.5 w-full overflow-hidden rounded-pill bg-surface-elevated">
        {/* `key` força o React a desmontar e remontar esta div a cada nova
            rodada — é assim que a animação CSS reinicia de forma confiável
            do zero, sem precisar de nenhum JS pra "resetar" um valor. */}
        <div
          key={`${resetKey}-${seconds}-${isPaused}`}
          className={cn("h-full rounded-pill", !isPaused && "animate-timer-countdown")}
          style={{
            width: isPaused ? (seconds <= 0 ? "0%" : "100%") : undefined,
            backgroundColor: isPaused ? "#2FE0BE" : undefined,
            animationDuration: isPaused ? undefined : `${seconds}s`,
          }}
        />
      </div>
      {label && <span className="font-sans text-[11px] text-text-tertiary">{label}</span>}
    </div>
  );
}
