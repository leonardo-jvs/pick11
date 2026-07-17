"use client";

import { Check, Sparkles, Crown, Gamepad2 } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { DraftPlayerCard as DraftPlayerCardType, Position, PlayerCategory } from "@/types/player";
import { getFormationSlots } from "@/services/formationService";
import { Formation } from "@/types/team";

const COMPAT_BADGE: Record<1 | 2 | 3, { badge: string | null; label: string }> = {
  3: { badge: "bg-success/15 text-success border-success/40", label: "+2 OVER" },
  2: { badge: "bg-warning/15 text-warning border-warning/40", label: "+1 OVER" },
  1: { badge: null, label: "" },
};

/**
 * Mesmo componente de card para as 3 categorias — muda só cores/gradiente/selo,
 * nunca a estrutura ou as informações exibidas (regra do produto).
 */
const CATEGORY_THEME: Record<
  PlayerCategory,
  {
    cardBg: string;
    border: string;
    glow: string;
    nameColor: string;
    secondaryText: string;
    tertiaryText: string;
    dividerBorder: string;
    posOpen: string;
    posClosed: string;
    badge?: { label: string; icon: React.ReactNode; className: string };
  }
> = {
  common: {
    cardBg: "bg-surface",
    border: "border-border-subtle",
    glow: "",
    nameColor: "text-text-primary",
    secondaryText: "text-text-secondary",
    tertiaryText: "text-text-tertiary",
    dividerBorder: "border-border-subtle",
    posOpen: "border-teal-dim/40 bg-teal-dim/15 text-teal-bright",
    posClosed: "border-border-subtle bg-surface-elevated text-text-tertiary",
  },
  prime: {
    cardBg: "bg-gradient-to-b from-prime-dim/35 via-surface to-surface",
    border: "border-prime/50",
    glow: "shadow-glow-prime",
    nameColor: "text-prime-bright",
    secondaryText: "text-text-secondary",
    tertiaryText: "text-text-tertiary",
    dividerBorder: "border-prime/25",
    posOpen: "border-prime/40 bg-prime/15 text-prime-bright",
    posClosed: "border-border-subtle bg-surface-elevated text-text-tertiary",
    badge: { label: "AUGE", icon: <Sparkles size={11} />, className: "bg-prime/20 text-prime-bright border-prime/50" },
  },
  legend: {
    cardBg: "bg-legend-bg",
    border: "border-gold/60",
    glow: "shadow-glow-gold",
    nameColor: "text-legend-text",
    secondaryText: "text-legend-text/70",
    tertiaryText: "text-legend-text/50",
    dividerBorder: "border-gold-dim/40",
    posOpen: "border-gold-dim/50 bg-gold/15 text-gold-dim",
    posClosed: "border-gold-dim/25 bg-black/5 text-legend-text/40",
    badge: { label: "LENDÁRIA", icon: <Crown size={11} />, className: "bg-gold/20 text-gold-dim border-gold-dim/50" },
  },
  proclubs: {
    cardBg: "bg-gradient-to-b from-danger/30 via-surface to-surface",
    border: "border-danger/30",
    glow: "shadow-glow-danger",
    nameColor: "text-text-primary",
    secondaryText: "text-text-secondary",
    tertiaryText: "text-text-tertiary",
    dividerBorder: "border-danger/25",
    posOpen: "border-danger/40 bg-danger/15 text-danger",
    posClosed: "border-border-subtle bg-surface-elevated text-text-tertiary",
    badge: { label: "PRO CLUBS", icon: <Gamepad2 size={11} />, className: "bg-danger/20 text-danger border-danger/50" },
  },
};

export function DraftPlayerCard({
  card,
  selected,
  disabled,
  disabledReason,
  formation,
  filledSlotIds,
  hideOverall,
  onToggle,
}: {
  card: DraftPlayerCardType;
  selected: boolean;
  disabled?: boolean;
  disabledReason?: string;
  /** Usados só para indicar visualmente quais posições do jogador ainda têm vaga (badges polivalentes) */
  formation?: Formation;
  filledSlotIds?: Set<string>;
  /** Modo "Over Oculto" da sala — esconde o número, mantém compatibilidade e o resto do card igual */
  hideOverall?: boolean;
  onToggle: () => void;
}) {
  const compat = COMPAT_BADGE[card.compatibilityStars];
  const theme = CATEGORY_THEME[card.category ?? "common"];
  const positions = [card.position, ...(card.secondaryPositions ?? [])];
  const slots = formation ? getFormationSlots(formation) : [];

  function hasOpenSlot(position: Position) {
    if (!formation || !filledSlotIds) return true;
    return slots.some((s) => s.acceptedPositions.includes(position) && !filledSlotIds.has(s.id));
  }

  return (
    <motion.div
      whileHover={disabled ? undefined : { y: -3, scale: 1.02 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      onClick={disabled ? undefined : onToggle}
      className={cn(
        "relative flex h-full cursor-pointer flex-col overflow-hidden rounded-xl border-2 transition-all duration-200",
        "px-[clamp(6px,1.8vmin,14px)] py-[clamp(5px,1.6vmin,12px)]",
        theme.cardBg,
        selected ? "border-success shadow-glow-success" : cn(theme.border, !disabled && theme.glow),
        disabled && "cursor-not-allowed opacity-50 hover:shadow-none"
      )}
    >
      {theme.badge && (
        <span
          className={cn(
            "absolute left-2 top-2 flex items-center gap-1 rounded-pill border font-mono font-bold uppercase tracking-wide",
            "px-[clamp(3px,0.8vmin,8px)] py-[clamp(0px,0.3vmin,2px)] text-[clamp(6px,1.2vmin,9px)]",
            theme.badge.className
          )}
        >
          {theme.badge.icon}
          {theme.badge.label}
        </span>
      )}

      {selected && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute right-2 top-2 flex size-[clamp(16px,3.2vmin,28px)] items-center justify-center rounded-full bg-success"
        >
          <Check size={13} strokeWidth={3} />
        </motion.div>
      )}

      {/* 1. Nome — centralizado, maior texto do card */}
      <p className={cn("truncate px-6 text-center font-sans font-bold leading-tight text-[clamp(9px,2.6vmin,21px)]", theme.nameColor)}>
        {card.name}
      </p>
      {card.season && (
        <p className={cn("text-center font-mono leading-tight text-[clamp(6px,1.3vmin,10px)]", theme.tertiaryText)}>
          {card.club} · {card.season}
        </p>
      )}

      {/* Posição — badge centralizada, logo abaixo do nome */}
      <div className="mt-[clamp(2px,0.6vmin,6px)] flex items-center justify-center gap-[clamp(2px,0.6vmin,6px)]">
        {positions.map((pos) => (
          <span
            key={pos}
            className={cn(
              "rounded border font-mono font-semibold leading-tight",
              "px-[clamp(4px,0.9vmin,8px)] py-[clamp(0px,0.3vmin,2px)] text-[clamp(7px,1.5vmin,11px)]",
              hasOpenSlot(pos) ? theme.posOpen : theme.posClosed
            )}
          >
            {pos}
          </span>
        ))}
      </div>

      {/* 2. Overall Final — maior número do card (oculto no modo "Over Oculto") */}
      <div className="flex flex-1 flex-col items-center justify-center">
        {hideOverall ? (
          <>
            <p className={cn("font-display leading-none tracking-wider text-[clamp(16px,4.6vmin,38px)]", theme.tertiaryText)}>???</p>
            <span className="mt-1 block h-[clamp(8px,1.6vmin,16px)]" />
          </>
        ) : (
          <>
            <p className={cn("font-display leading-none text-[clamp(18px,5.5vmin,46px)]", theme.nameColor)}>{card.overallFinal}</p>
            {card.compatibilityDelta > 0 ? (
              <p
                className={cn(
                  "mt-1 font-mono font-semibold leading-none text-[clamp(8px,1.8vmin,14px)]",
                  card.compatibilityStars === 3 ? "text-success" : "text-warning"
                )}
              >
                (+{card.compatibilityDelta})
              </p>
            ) : (
              <span className="mt-1 block h-[clamp(8px,1.6vmin,16px)]" />
            )}
          </>
        )}
      </div>

      {/* 3. Compatibilidade — centralizada, bem legível */}
      <div className="mb-[clamp(4px,1vmin,8px)] flex flex-col items-center justify-center gap-[clamp(1px,0.4vmin,4px)]">
        <p className={cn("font-sans uppercase leading-none tracking-wide text-[clamp(6px,1.3vmin,10px)]", theme.tertiaryText)}>
          Compatibilidade
        </p>
        <div className="flex items-center gap-[clamp(3px,0.7vmin,6px)]">
          <div className="flex items-center gap-[clamp(1px,0.4vmin,4px)]">
            {[1, 2, 3].map((i) => (
              <span
                key={i}
                className={cn("leading-none text-[clamp(10px,2.4vmin,20px)]", i <= card.compatibilityStars ? "text-gold" : "text-border-strong")}
              >
                ★
              </span>
            ))}
          </div>
          {compat.badge && (
            <span
              className={cn(
                "rounded-pill border font-mono font-semibold leading-tight",
                "px-[clamp(4px,0.9vmin,8px)] py-[clamp(0px,0.3vmin,2px)] text-[clamp(6px,1.3vmin,10px)]",
                compat.badge
              )}
            >
              {compat.label}
            </span>
          )}
        </div>
      </div>

      {/* Rodapé — duas colunas: Ataque/Defesa à esquerda, Clube/Posição à direita */}
      <div className={cn("grid grid-cols-2 border-t gap-x-[clamp(4px,1.4vmin,12px)] pt-[clamp(3px,0.9vmin,8px)]", theme.dividerBorder)}>
        <div className="space-y-[clamp(2px,0.5vmin,6px)]">
          <div>
            <p className={cn("font-sans uppercase leading-none tracking-wide text-[clamp(6px,1.3vmin,10px)]", theme.tertiaryText)}>Ataque</p>
            <p className={cn("truncate font-sans font-medium leading-tight text-[clamp(7.5px,1.7vmin,13px)]", theme.secondaryText)}>
              {card.attackStyle}
            </p>
          </div>
          <div>
            <p className={cn("font-sans uppercase leading-none tracking-wide text-[clamp(6px,1.3vmin,10px)]", theme.tertiaryText)}>Defesa</p>
            <p className={cn("truncate font-sans font-medium leading-tight text-[clamp(7.5px,1.7vmin,13px)]", theme.secondaryText)}>
              {card.defenseStyle}
            </p>
          </div>
        </div>
        <div className="space-y-[clamp(2px,0.5vmin,6px)] text-right">
          <div>
            <p className={cn("font-sans uppercase leading-none tracking-wide text-[clamp(6px,1.3vmin,10px)]", theme.tertiaryText)}>Clube</p>
            <p className={cn("truncate font-sans font-medium leading-tight text-[clamp(7.5px,1.7vmin,13px)]", theme.secondaryText)}>
              {card.club}
            </p>
          </div>
          <div>
            <p className={cn("font-sans uppercase leading-none tracking-wide text-[clamp(6px,1.3vmin,10px)]", theme.tertiaryText)}>Posição</p>
            <p className={cn("truncate font-sans font-medium leading-tight text-[clamp(7.5px,1.7vmin,13px)]", theme.secondaryText)}>
              {card.position}
            </p>
          </div>
        </div>
      </div>

      {disabled && disabledReason && (
        <p className="mt-1 truncate text-center font-sans leading-tight text-[clamp(6px,1.3vmin,10px)] text-danger">{disabledReason}</p>
      )}
    </motion.div>
  );
}
