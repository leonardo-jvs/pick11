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
 * `compact` esconde a coluna de clube (usado no layout de duas colunas lado
 * a lado da tela de Estatísticas da Competição, pensado pra caber no celular).
 */
export function TopListTable({
  rows,
  valueLabel,
  emptyLabel,
  compact = false,
}: {
  rows: TopListRow[];
  valueLabel: string;
  emptyLabel: string;
  compact?: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-card border border-border-subtle bg-surface">
      <div className="overflow-x-auto">
        <table className="w-full font-mono text-xs">
          {!compact && (
            <thead>
              <tr className="border-b border-border-subtle bg-surface-elevated text-[10px] uppercase tracking-wide text-text-tertiary">
                <th className="px-3 py-2.5 text-left">#</th>
                <th className="px-2 py-2.5 text-left">Jogador</th>
                <th className="px-2 py-2.5 text-left">Clube</th>
                <th className="px-2 py-2.5 text-right">{valueLabel}</th>
              </tr>
            </thead>
          )}
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={compact ? 3 : 4} className={cn("text-center text-text-tertiary", compact ? "px-2 py-3 text-[10px]" : "px-3 py-5")}>
                  {emptyLabel}
                </td>
              </tr>
            ) : (
              rows.map((row, i) => (
                <tr key={`${row.playerName}-${i}`} className={cn("border-b border-border-subtle/40 last:border-0", i === 0 && "bg-gold/5")}>
                  <td className={cn("text-text-tertiary", compact ? "px-1.5 py-1 text-[10px]" : "px-3 py-2")}>{i + 1}</td>
                  <td className={cn("truncate text-text-secondary", compact ? "px-1 py-1 text-[10px]" : "px-2 py-2")}>{row.playerName}</td>
                  {!compact && <td className="truncate px-2 py-2 text-text-tertiary">{row.teamName}</td>}
                  <td className={cn("text-right font-bold", i === 0 ? "text-gold" : "text-text-primary", compact ? "px-1.5 py-1 text-[10px]" : "px-2 py-2 text-sm")}>
                    {row.value}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
