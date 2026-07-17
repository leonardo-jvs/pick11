"use client";

import { TeamTactics } from "@/types/team";

/**
 * Barra inferior simplificada — a lista de posições/jogadores foi para o
 * campinho do painel esquerdo. Aqui fica só o resumo rápido, sempre visível.
 */
export function DraftFormationBar({
  tactics,
  overallPartial,
  hasStarters,
}: {
  tactics: TeamTactics;
  overallPartial: number;
  hasStarters: boolean;
}) {
  return (
    <div className="flex shrink-0 items-center justify-center gap-6 rounded-lg border border-border-subtle bg-surface/95 px-4 py-2 font-mono text-xs text-text-tertiary backdrop-blur">
      <span>
        Formação <span className="font-semibold text-text-primary">{tactics.formation}</span>
      </span>
      <span>
        Overall <span className="font-semibold text-gold">{hasStarters ? overallPartial : "—"}</span>
      </span>
      <span>
        Ataque <span className="font-semibold text-text-primary">{tactics.attackStyle}</span>
      </span>
      <span>
        Defesa <span className="font-semibold text-text-primary">{tactics.defenseStyle}</span>
      </span>
    </div>
  );
}
