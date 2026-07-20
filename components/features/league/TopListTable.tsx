import { cn } from "@/lib/utils";

export interface TopListRow {
  playerName: string;
  teamName: string;
  value: number;
}

/**
 * Tabela de ranking genérica (artilharia, assistências, ou qualquer outra
 * lista "jogador + clube + número") — mesmo estilo visual da StandingsTable,
 * reaproveitado pra manter a interface consistente entre as duas telas.
 */
export function TopListTable({ rows, valueLabel, emptyLabel }: { rows: TopListRow[]; valueLabel: string; emptyLabel: string }) {
  return (
    <div className="overflow-hidden rounded-card border border-border-subtle bg-surface">
      <div className="overflow-x-auto">
        <table className="w-full font-mono text-xs">
          <thead>
            <tr className="border-b border-border-subtle bg-surface-elevated text-[10px] uppercase tracking-wide text-text-tertiary">
              <th className="px-3 py-2.5 text-left">#</th>
              <th className="px-2 py-2.5 text-left">Jogador</th>
              <th className="px-2 py-2.5 text-left">Clube</th>
              <th className="px-2 py-2.5 text-right">{valueLabel}</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-5 text-center text-text-tertiary">
                  {emptyLabel}
                </td>
              </tr>
            ) : (
              rows.map((row, i) => (
                <tr key={`${row.playerName}-${i}`} className={cn("border-b border-border-subtle/50 last:border-0", i === 0 && "bg-gold/5")}>
                  <td className="px-3 py-2 text-text-tertiary">{i + 1}</td>
                  <td className="truncate px-2 py-2 text-text-secondary">{row.playerName}</td>
                  <td className="truncate px-2 py-2 text-text-tertiary">{row.teamName}</td>
                  <td className={cn("px-2 py-2 text-right text-sm font-bold", i === 0 ? "text-gold" : "text-text-primary")}>{row.value}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
