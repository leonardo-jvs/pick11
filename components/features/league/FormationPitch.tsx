"use client";

import { cn } from "@/lib/utils";
import { Player, Position } from "@/types/player";
import { Formation, TeamTactics } from "@/types/team";
import { getFormationSlots, assignPlayersToSlots } from "@/services/formationService";
import { toDraftPlayerCard } from "@/services/compatibilityService";

/**
 * Ordem visual exata de cada linha, da frente (ataque) pro fundo (goleiro) —
 * é isso que garante que qualquer campinho do Pick11 seja lido imediatamente
 * como um 4-3-3 ou um 4-4-2, nunca jogadores fora de ordem.
 */
const ROW_LAYOUT: Record<Formation, { row: "ataque" | "meio" | "defesa" | "goleiro"; slotIds: string[] }[]> = {
  "4-3-3": [
    { row: "ataque", slotIds: ["ata-1", "ata-2", "ata-3"] },
    { row: "meio", slotIds: ["mc-1", "mc-2", "mc-3"] },
    { row: "defesa", slotIds: ["lat-e", "zag-1", "zag-2", "lat-d"] },
    { row: "goleiro", slotIds: ["gol"] },
  ],
  "4-4-2": [
    { row: "ataque", slotIds: ["ata-1", "ata-2"] },
    { row: "meio", slotIds: ["me", "mc-1", "mc-2", "md"] },
    { row: "defesa", slotIds: ["lat-e", "zag-1", "zag-2", "lat-d"] },
    { row: "goleiro", slotIds: ["gol"] },
  ],
};

export function FormationPitch({
  formation,
  filledSlots,
  players,
  tactics,
  hideOverall,
  boostedPositions,
  boostDelta,
  size = "md",
  /** Só usado pelo Draft — escala com a viewport (clamp) em vez de um tamanho fixo, pra caber em qualquer resolução sem precisar de zoom. Não afeta nenhuma outra tela. */
  responsive = false,
  className,
}: {
  formation: Formation;
  /** Use quando já existe o mapeamento exato slot -> jogador (ex: draftState.filledSlots) */
  filledSlots?: Record<string, Player>;
  /** Use quando só existe a lista de titulares (ex: Pré-Partida) — o componente posiciona automaticamente */
  players?: Player[];
  /** Se informado, mostra o Overall Final (com compatibilidade) em vez do Overall bruto */
  tactics?: TeamTactics;
  /** Modo "Over Oculto" — esconde o número, mantém tudo o mais */
  hideOverall?: boolean;
  boostedPositions?: Position[];
  boostDelta?: number;
  size?: "sm" | "md";
  responsive?: boolean;
  className?: string;
}) {
  const resolvedSlots = filledSlots ?? (players ? assignPlayersToSlots(players, formation) : {});
  const slotLabels = new Map(getFormationSlots(formation).map((s) => [s.id, s.label]));
  const rows = ROW_LAYOUT[formation];

  const cardW = responsive ? "w-[clamp(34px,6.4vw,76px)]" : size === "sm" ? "w-[58px]" : "w-[76px]";
  const nameSize = responsive ? "text-[clamp(6.5px,1.05vh,10.5px)]" : size === "sm" ? "text-[9px]" : "text-[10.5px]";
  const overallSize = responsive ? "text-[clamp(7px,1.25vh,12px)]" : size === "sm" ? "text-[10px]" : "text-xs";
  const labelSize = responsive ? "text-[clamp(5.5px,0.85vh,8px)]" : "text-[8px]";
  const chipPad = responsive ? "px-[clamp(1px,0.35vw,4px)] py-[clamp(1px,0.5vh,6px)]" : "px-1 py-1.5";
  const rootPad = responsive ? "p-[clamp(4px,0.9vh,10px)]" : "p-2.5";
  const rootGap = responsive ? "gap-[clamp(2px,0.7vh,8px)]" : "gap-2";
  const rowGap = responsive ? "gap-[clamp(2px,0.4vw,6px)]" : "gap-1.5";

  return (
    <div className={cn("tactics-field flex flex-col justify-between rounded-card border border-border-subtle bg-surface", rootGap, rootPad, className)}>
      {rows.map(({ row, slotIds }) => (
        <div key={row} className={cn("flex items-center justify-center", rowGap)}>
          {slotIds.map((slotId) => {
            const player = resolvedSlots[slotId];
            const label = slotLabels.get(slotId) ?? "";
            const isBoosted = !!player && !!boostedPositions?.includes(player.position) && !!boostDelta;
            const isPenalty = isBoosted && boostDelta! < 0;
            const overall = player ? (tactics ? toDraftPlayerCard(player, tactics).overallFinal : player.overall) : null;

            return (
              <div
                key={slotId}
                className={cn(
                  cardW,
                  chipPad,
                  "flex shrink-0 flex-col items-center gap-0.5 rounded-md border text-center transition-colors",
                  player
                    ? isBoosted
                      ? isPenalty
                        ? "border-danger/50 bg-danger/10"
                        : "border-success/50 bg-success/10"
                      : "border-teal-dim/40 bg-teal-dim/10"
                    : "border-border-subtle bg-surface-elevated"
                )}
              >
                <span className={cn("font-mono leading-none text-text-tertiary", labelSize)}>{label}</span>
                {player ? (
                  <>
                    <span className={cn("w-full truncate font-sans font-medium leading-tight text-text-primary", nameSize)}>
                      {player.name}
                    </span>
                    {hideOverall ? (
                      <span className={cn("font-mono font-bold leading-none text-text-tertiary", overallSize)}>???</span>
                    ) : isBoosted ? (
                      <span className={cn("flex items-center gap-0.5 font-mono leading-none", nameSize)}>
                        <span className="text-text-tertiary line-through">{player.overall}</span>
                        <span className={cn("font-bold", isPenalty ? "text-danger" : "text-success")}>
                          {Math.max(40, Math.min(99, player.overall + boostDelta!))}
                        </span>
                      </span>
                    ) : (
                      <span className={cn("font-mono font-bold leading-none text-gold", overallSize)}>{overall}</span>
                    )}
                  </>
                ) : (
                  <span className={cn("font-sans leading-tight text-text-tertiary", labelSize)}>vazio</span>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
