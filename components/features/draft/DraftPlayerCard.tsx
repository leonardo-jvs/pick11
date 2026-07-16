"use client";

import { Check } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { DraftPlayerCard as DraftPlayerCardType, Position } from "@/types/player";
import { getFormationSlots } from "@/services/formationService";
import { Formation } from "@/types/team";

const COMPAT_BADGE: Record<1 | 2 | 3, { badge: string | null; label: string }> = {
  3: { badge: "bg-success/15 text-success border-success/40", label: "+2 OVER" },
  2: { badge: "bg-warning/15 text-warning border-warning/40", label: "+1 OVER" },
  1: { badge: null, label: "" },
};

export function DraftPlayerCard({
  card,
  selected,
  disabled,
  disabledReason,
  formation,
  filledSlotIds,
  onToggle,
}: {
  card: DraftPlayerCardType;
  selected: boolean;
  disabled?: boolean;
  disabledReason?: string;
  /** Usados só para indicar visualmente quais posições do jogador ainda têm vaga (badges polivalentes) */
  formation?: Formation;
  filledSlotIds?: Set<string>;
  onToggle: () => void;
}) {
  const compat = COMPAT_BADGE[card.compatibilityStars];
  const positions = [card.position, ...(card.secondaryPositions ?? [])];
  const slots = formation ? getFormationSlots(formation) : [];

  function hasOpenSlot(position: Position) {
    if (!formation || !filledSlotIds) return true;
    return slots.some((s) => s.acceptedPositions.includes(position) && !filledSlotIds.has(s.id));
  }

  return (
    <motion.div
      whileHover={disabled ? undefined : { y: -2, scale: 1.015 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      onClick={disabled ? undefined : onToggle}
      className={cn(
        "relative flex h-full cursor-pointer flex-col overflow-hidden rounded-lg border-2 bg-surface px-2 py-1.5 transition-all duration-200",
        selected ? "border-success shadow-glow-success" : "border-border-subtle",
        disabled && "cursor-not-allowed opacity-50 hover:shadow-none"
      )}
    >
      {selected && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute right-1.5 top-1.5 flex size-5 items-center justify-center rounded-full bg-success"
        >
          <Check size={11} strokeWidth={3} />
        </motion.div>
      )}

      {/* 1. Nome — centralizado, maior texto do card */}
      <p className="truncate px-5 text-center font-sans text-[14px] font-bold leading-tight text-text-primary">{card.name}</p>

      {/* Posição — badge pequena, centralizada, logo abaixo do nome */}
      <div className="mt-1 flex items-center justify-center gap-1">
        {positions.map((pos) => (
          <span
            key={pos}
            className={cn(
              "rounded border px-1.5 py-px font-mono text-[9px] font-semibold leading-tight",
              hasOpenSlot(pos)
                ? "border-teal-dim/40 bg-teal-dim/15 text-teal-bright"
                : "border-border-subtle bg-surface-elevated text-text-tertiary"
            )}
          >
            {pos}
          </span>
        ))}
      </div>

      {/* 2. Overall Final — maior número do card */}
      <div className="flex flex-1 flex-col items-center justify-center">
        <p className="font-display text-[32px] leading-none text-text-primary">{card.overallFinal}</p>
        {card.compatibilityDelta > 0 ? (
          <p className={cn("mt-0.5 font-mono text-[10px] font-semibold leading-none", card.compatibilityStars === 3 ? "text-success" : "text-warning")}>
            (+{card.compatibilityDelta})
          </p>
        ) : (
          <span className="mt-0.5 block h-[12px]" />
        )}
      </div>

      {/* 3. Compatibilidade — discreta, centralizada */}
      <div className="mb-1.5 flex flex-col items-center justify-center gap-0.5">
        <p className="font-sans text-[8.5px] uppercase leading-none tracking-wide text-text-tertiary">Compatibilidade</p>
        <div className="flex items-center gap-1">
          <div className="flex items-center gap-0.5">
            {[1, 2, 3].map((i) => (
              <span key={i} className={cn("text-xs leading-none", i <= card.compatibilityStars ? "text-gold" : "text-border-strong")}>
                ★
              </span>
            ))}
          </div>
          {compat.badge && (
            <span className={cn("rounded-pill border px-1.5 py-px font-mono text-[8px] font-semibold leading-tight", compat.badge)}>
              {compat.label}
            </span>
          )}
        </div>
      </div>

      {/* Linha divisória discreta */}
      {/* Rodapé — duas colunas: Ataque/Defesa à esquerda, Clube/Posição à direita */}
      <div className="grid grid-cols-2 gap-x-2 border-t border-border-subtle pt-1.5">
        <div className="space-y-1">
          <div>
            <p className="font-sans text-[8px] uppercase leading-none tracking-wide text-text-tertiary">Ataque</p>
            <p className="truncate font-sans text-[10px] font-medium leading-tight text-text-secondary">{card.attackStyle}</p>
          </div>
          <div>
            <p className="font-sans text-[8px] uppercase leading-none tracking-wide text-text-tertiary">Defesa</p>
            <p className="truncate font-sans text-[10px] font-medium leading-tight text-text-secondary">{card.defenseStyle}</p>
          </div>
        </div>
        <div className="space-y-1 text-right">
          <div>
            <p className="font-sans text-[8px] uppercase leading-none tracking-wide text-text-tertiary">Clube</p>
            <p className="truncate font-sans text-[10px] font-medium leading-tight text-text-secondary">{card.club}</p>
          </div>
          <div>
            <p className="font-sans text-[8px] uppercase leading-none tracking-wide text-text-tertiary">Posição</p>
            <p className="truncate font-sans text-[10px] font-medium leading-tight text-text-secondary">{card.position}</p>
          </div>
        </div>
      </div>

      {disabled && disabledReason && (
        <p className="mt-0.5 truncate text-center font-sans text-[8px] leading-tight text-danger">{disabledReason}</p>
      )}
    </motion.div>
  );
}
