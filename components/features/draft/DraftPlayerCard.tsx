"use client";

import { Check, Sparkles, Crown, Gamepad2, Clock, Target } from "lucide-react";
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
    badge: { label: "AUGE", icon: <Sparkles size={10} />, className: "bg-prime/20 text-prime-bright border-prime/50" },
  },
  veteran: {
    // Fundo azul claro, de propósito bem diferente do dourado (Lendária) e do
    // roxo (Auge) — fácil de reconhecer de longe na coleção.
    cardBg: "bg-blue-50",
    border: "border-blue-300/70",
    glow: "shadow-[0_0_18px_rgba(59,130,246,0.3)]",
    nameColor: "text-blue-950",
    secondaryText: "text-blue-950/70",
    tertiaryText: "text-blue-950/50",
    dividerBorder: "border-blue-300/50",
    posOpen: "border-blue-400/50 bg-blue-500/15 text-blue-700",
    posClosed: "border-blue-300/30 bg-black/5 text-blue-950/40",
    badge: { label: "FIM DE CARREIRA", icon: <Clock size={10} />, className: "bg-blue-500/20 text-blue-700 border-blue-400/50" },
  },
  kingofamerica: {
    // Dourado fosco (mais escuro/discreto que o dourado vivo da Lendária) com
    // detalhes em verde-esmeralda — prestígio histórico sem parecer superior
    // à Lendária. Brilho mais contido também (glow menor, cor diferente).
    cardBg: "bg-gradient-to-b from-amber-950/50 via-surface to-surface",
    border: "border-emerald-600/50",
    glow: "shadow-[0_0_14px_rgba(16,185,129,0.22)]",
    nameColor: "text-amber-200",
    secondaryText: "text-text-secondary",
    tertiaryText: "text-text-tertiary",
    dividerBorder: "border-emerald-700/30",
    posOpen: "border-emerald-500/40 bg-emerald-500/15 text-emerald-300",
    posClosed: "border-border-subtle bg-surface-elevated text-text-tertiary",
    badge: { label: "REI DA AMÉRICA", icon: <Crown size={10} />, className: "bg-emerald-500/20 text-emerald-300 border-emerald-500/50" },
  },
  topscorer: {
    // Laranja/vermelho — remete ao "artilheiro" (rede pegando fogo), visual
    // bem distinto do roxo (Auge), azul (Fim de Carreira), dourado fosco com
    // esmeralda (Rei da América) e dourado vivo (Lendária). Fácil de
    // reconhecer de longe na Coleção junto com as demais.
    cardBg: "bg-gradient-to-b from-orange-950/45 via-surface to-surface",
    border: "border-orange-500/50",
    glow: "shadow-[0_0_14px_rgba(249,115,22,0.25)]",
    nameColor: "text-orange-300",
    secondaryText: "text-text-secondary",
    tertiaryText: "text-text-tertiary",
    dividerBorder: "border-orange-600/30",
    posOpen: "border-orange-500/40 bg-orange-500/15 text-orange-300",
    posClosed: "border-border-subtle bg-surface-elevated text-text-tertiary",
    badge: { label: "ARTILHEIRO DA TEMPORADA", icon: <Target size={10} />, className: "bg-orange-500/20 text-orange-300 border-orange-500/50" },
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
    badge: { label: "LENDÁRIA", icon: <Crown size={10} />, className: "bg-gold/20 text-gold-dim border-gold-dim/50" },
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
    badge: { label: "PRO CLUBS", icon: <Gamepad2 size={10} />, className: "bg-danger/20 text-danger border-danger/50" },
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
    <div
      onClick={disabled ? undefined : onToggle}
      className={cn(
        "relative flex h-full cursor-pointer flex-col overflow-hidden rounded-xl border-2 transition-all duration-150 ease-out",
        "px-[clamp(5px,1.55vmin,12px)] py-[clamp(4px,1.35vmin,10px)]",
        !disabled && "hover:-translate-y-[3px] hover:scale-[1.02]",
        theme.cardBg,
        selected ? "border-success shadow-glow-success" : cn(theme.border, !disabled && theme.glow),
        disabled && "cursor-not-allowed opacity-50 hover:shadow-none"
      )}
    >
      {selected && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute right-1.5 top-1.5 z-10 flex size-[clamp(14px,2.8vmin,24px)] items-center justify-center rounded-full bg-success"
        >
          <Check size={12} strokeWidth={3} />
        </motion.div>
      )}

      {/* Cabeçalho — sempre em fluxo normal (nunca absoluto), pra nunca sobrepor o nome:
          selo da categoria (se houver) > nome > clube/temporada > posições */}
      <div className="flex flex-col items-center">
        {theme.badge && (
          <span
            className={cn(
              "mb-[clamp(2px,0.6vmin,5px)] flex shrink-0 items-center gap-1 rounded-pill border font-mono font-bold uppercase tracking-wide",
              "px-[clamp(3px,0.7vmin,7px)] py-[clamp(0px,0.25vmin,2px)] text-[clamp(5.5px,1.05vmin,8px)]",
              theme.badge.className
            )}
          >
            {theme.badge.icon}
            {theme.badge.label}
          </span>
        )}

        <p className={cn("w-full truncate px-[clamp(10px,2.1vmin,18px)] text-center font-sans font-bold leading-tight text-[clamp(8.5px,2.3vmin,18px)]", theme.nameColor)}>
          {card.name}
        </p>

        {card.season && (
          <p className={cn("mt-[clamp(1px,0.3vmin,2px)] text-center font-mono leading-tight text-[clamp(5.5px,1.15vmin,9px)]", theme.tertiaryText)}>
            {card.club} · {card.season}
          </p>
        )}

        <div className="mt-[clamp(2px,0.55vmin,5px)] flex flex-wrap items-center justify-center gap-[clamp(2px,0.55vmin,5px)]">
          {positions.map((pos) => (
            <span
              key={pos}
              className={cn(
                "rounded border font-mono font-semibold leading-tight",
                "px-[clamp(3px,0.8vmin,7px)] py-[clamp(0px,0.25vmin,2px)] text-[clamp(6px,1.3vmin,10px)]",
                hasOpenSlot(pos) ? theme.posOpen : theme.posClosed
              )}
            >
              {pos}
            </span>
          ))}
        </div>
      </div>

      {/* 2. Overall Final — maior número do card, sempre em destaque (oculto no modo "Over Oculto") */}
      <div className="flex flex-1 flex-col items-center justify-center">
        {hideOverall ? (
          <>
            <p className={cn("font-display leading-none tracking-wider text-[clamp(15px,4vmin,33px)]", theme.tertiaryText)}>???</p>
            <span className="mt-1 block h-[clamp(7px,1.4vmin,14px)]" />
          </>
        ) : (
          <>
            <p className={cn("font-display leading-none text-[clamp(17px,4.9vmin,41px)]", theme.nameColor)}>{card.overallFinal}</p>
            {card.compatibilityDelta > 0 ? (
              <p
                className={cn(
                  "mt-1 font-mono font-semibold leading-none text-[clamp(7px,1.6vmin,12px)]",
                  card.compatibilityStars === 3 ? "text-success" : "text-warning"
                )}
              >
                (+{card.compatibilityDelta})
              </p>
            ) : (
              <span className="mt-1 block h-[clamp(7px,1.4vmin,14px)]" />
            )}
          </>
        )}
      </div>

      {/* 3. Compatibilidade — centralizada, bem legível */}
      <div className="mb-[clamp(3px,0.9vmin,7px)] flex flex-col items-center justify-center gap-[clamp(1px,0.35vmin,3px)]">
        <p className={cn("font-sans uppercase leading-none tracking-wide text-[clamp(5.5px,1.15vmin,9px)]", theme.tertiaryText)}>
          Compatibilidade
        </p>
        <div className="flex items-center gap-[clamp(2px,0.6vmin,5px)]">
          <div className="flex items-center gap-[clamp(1px,0.35vmin,3px)]">
            {[1, 2, 3].map((i) => (
              <span
                key={i}
                className={cn("leading-none text-[clamp(9px,2.1vmin,17px)]", i <= card.compatibilityStars ? "text-gold" : "text-border-strong")}
              >
                ★
              </span>
            ))}
          </div>
          {compat.badge && (
            <span
              className={cn(
                "rounded-pill border font-mono font-semibold leading-tight",
                "px-[clamp(3px,0.8vmin,7px)] py-[clamp(0px,0.25vmin,2px)] text-[clamp(5.5px,1.15vmin,9px)]",
                compat.badge
              )}
            >
              {compat.label}
            </span>
          )}
        </div>
      </div>

      {/* Rodapé — duas colunas: Ataque/Defesa à esquerda, Clube/Posição à direita */}
      <div className={cn("grid grid-cols-2 border-t gap-x-[clamp(3px,1.2vmin,10px)] pt-[clamp(2px,0.75vmin,7px)]", theme.dividerBorder)}>
        <div className="space-y-[clamp(1px,0.45vmin,5px)]">
          <div>
            <p className={cn("font-sans uppercase leading-none tracking-wide text-[clamp(5.5px,1.15vmin,9px)]", theme.tertiaryText)}>Ataque</p>
            <p className={cn("truncate font-sans font-medium leading-tight text-[clamp(6.5px,1.5vmin,11px)]", theme.secondaryText)}>
              {card.attackStyle}
            </p>
          </div>
          <div>
            <p className={cn("font-sans uppercase leading-none tracking-wide text-[clamp(5.5px,1.15vmin,9px)]", theme.tertiaryText)}>Defesa</p>
            <p className={cn("truncate font-sans font-medium leading-tight text-[clamp(6.5px,1.5vmin,11px)]", theme.secondaryText)}>
              {card.defenseStyle}
            </p>
          </div>
        </div>
        <div className="space-y-[clamp(1px,0.45vmin,5px)] text-right">
          <div>
            <p className={cn("font-sans uppercase leading-none tracking-wide text-[clamp(5.5px,1.15vmin,9px)]", theme.tertiaryText)}>Clube</p>
            <p className={cn("truncate font-sans font-medium leading-tight text-[clamp(6.5px,1.5vmin,11px)]", theme.secondaryText)}>
              {card.club}
            </p>
          </div>
          <div>
            <p className={cn("font-sans uppercase leading-none tracking-wide text-[clamp(5.5px,1.15vmin,9px)]", theme.tertiaryText)}>Posição</p>
            <p className={cn("truncate font-sans font-medium leading-tight text-[clamp(6.5px,1.5vmin,11px)]", theme.secondaryText)}>
              {card.position}
            </p>
          </div>
        </div>
      </div>

      {disabled && disabledReason && (
        <p className="mt-1 truncate text-center font-sans leading-tight text-[clamp(5.5px,1.15vmin,9px)] text-danger">{disabledReason}</p>
      )}
    </div>
  );
}
