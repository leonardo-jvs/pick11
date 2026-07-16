"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface TimerProps {
  seconds: number;
  onComplete?: () => void;
  size?: number;
  paused?: boolean;
  /** Muda a key para reiniciar o timer (ex: nova rodada do draft) */
  resetKey?: string | number;
  className?: string;
  label?: string;
}

const RADIUS = 45;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function Timer({
  seconds,
  onComplete,
  size = 120,
  paused = false,
  resetKey,
  className,
  label,
}: TimerProps) {
  const [remaining, setRemaining] = useState(seconds);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  // Reinicia a contagem sempre que a rodada (resetKey) ou a duração mudarem.
  // Fica em um efeito isolado — nunca durante o render.
  useEffect(() => {
    setRemaining(seconds);
  }, [seconds, resetKey]);

  // Único intervalo ativo por vez: o cleanup abaixo sempre destrói o intervalo
  // anterior antes de criar outro, seja por troca de rodada, pausa ou duração.
  // O updater de setRemaining APENAS decrementa o número — nunca chama
  // onComplete nem qualquer outro setState de fora daqui, evitando o erro
  // "Cannot update a component while rendering a different component".
  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => {
      setRemaining((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, [seconds, resetKey, paused]);

  // onComplete é disparado como reação à mudança de `remaining`, sempre depois
  // do commit do render — nunca dentro do updater de estado, nunca durante o render.
  useEffect(() => {
    if (remaining === 0) {
      onCompleteRef.current?.();
    }
  }, [remaining]);

  const progress = remaining / seconds;
  const isUrgent = remaining <= Math.min(3, Math.ceil(seconds * 0.25));
  const strokeColor = isUrgent ? "#FF5C5C" : "#2FE0BE";

  return (
    <div
      className={cn("relative inline-flex items-center justify-center", isUrgent && "animate-pulse-ring rounded-full", className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} viewBox="0 0 100 100" className="-rotate-90">
        <circle cx="50" cy="50" r={RADIUS} fill="none" stroke="#233029" strokeWidth="6" />
        <circle
          cx="50"
          cy="50"
          r={RADIUS}
          fill="none"
          stroke={strokeColor}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - progress)}
          style={{ transition: "stroke-dashoffset 1s linear, stroke 0.3s ease" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center">
        <span
          className={cn(
            "font-display text-4xl leading-none tracking-wide tabular-nums",
            isUrgent ? "text-danger" : "text-text-primary"
          )}
        >
          {remaining}
        </span>
        {label && <span className="mt-1 font-sans text-[11px] text-text-tertiary">{label}</span>}
      </div>
    </div>
  );
}
