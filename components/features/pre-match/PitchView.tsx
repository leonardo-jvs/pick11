"use client";

import { cn } from "@/lib/utils";
import { Player, Position } from "@/types/player";

const ROW_GROUPS: { title: string; positions: Position[] }[] = [
  { title: "Ataque", positions: ["ATA"] },
  { title: "Meio-campo", positions: ["MEI", "VOL"] },
  { title: "Defesa", positions: ["ZAG", "LAT"] },
  { title: "Goleiro", positions: ["GOL"] },
];

export function PitchView({
  players,
  boostedPositions,
  boostDelta,
}: {
  players: Player[];
  /** Posições que recebem o bônus selecionado (ex: ATA/MEI no Bicho) */
  boostedPositions?: Position[];
  boostDelta?: number;
}) {
  return (
    <div className="tactics-field space-y-2 rounded-card border border-border-subtle bg-surface p-3">
      {ROW_GROUPS.map((row) => {
        const rowPlayers = players.filter((p) => row.positions.includes(p.position));
        if (rowPlayers.length === 0) return null;
        return (
          <div key={row.title} className="flex flex-wrap justify-center gap-1.5">
            {rowPlayers.map((p) => {
              const isBoosted = !!boostedPositions?.includes(p.position) && !!boostDelta;
              const isPenalty = isBoosted && boostDelta! < 0;
              return (
                <div
                  key={p.id}
                  className={cn(
                    "flex min-w-[64px] flex-col items-center gap-0.5 rounded-md border px-1.5 py-1.5 text-center transition-colors",
                    isBoosted
                      ? isPenalty
                        ? "border-danger/50 bg-danger/10"
                        : "border-success/50 bg-success/10"
                      : "border-border-subtle bg-surface-elevated"
                  )}
                >
                  <span className="font-mono text-[8px] text-text-tertiary">{p.position}</span>
                  <span className="max-w-[60px] truncate font-sans text-[10px] font-medium leading-tight text-text-primary">
                    {p.name}
                  </span>
                  {isBoosted ? (
                    <span className="flex items-center gap-1 font-mono text-[10px] leading-none">
                      <span className="text-text-tertiary line-through">{p.overall}</span>
                      <span className={cn("font-bold", isPenalty ? "text-danger" : "text-success")}>
                        {Math.max(40, Math.min(99, p.overall + boostDelta!))}
                      </span>
                    </span>
                  ) : (
                    <span className="font-mono text-[11px] font-bold leading-none text-gold">{p.overall}</span>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
