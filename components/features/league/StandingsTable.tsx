import { StandingRow } from "@/types/match";
import { cn } from "@/lib/utils";

const CONTINENTAL_SPOTS = 4; // primeiras N posições — destaque verde (libertadores/G-4)
const RELEGATION_SPOTS = 4; // últimas N posições — destaque vermelho (rebaixamento)

export function StandingsTable({ standings }: { standings: StandingRow[] }) {
  return (
    <div className="overflow-hidden rounded-card border border-border-subtle bg-surface">
      <div className="overflow-x-auto">
        <table className="w-full font-mono text-xs">
          <thead>
            <tr className="border-b border-border-subtle bg-surface-elevated text-[10px] uppercase tracking-wide text-text-tertiary">
              <th className="px-3 py-2.5 text-left">#</th>
              <th className="px-2 py-2.5 text-left">Clube</th>
              <th className="px-1.5 py-2.5">P</th>
              <th className="px-1.5 py-2.5">J</th>
              <th className="px-1.5 py-2.5">V</th>
              <th className="px-1.5 py-2.5">E</th>
              <th className="px-1.5 py-2.5">D</th>
              <th className="px-1.5 py-2.5">SG</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((row, i) => {
              const position = i + 1;
              const isContinental = position <= CONTINENTAL_SPOTS;
              const isRelegation = position > standings.length - RELEGATION_SPOTS;
              return (
                <tr
                  key={row.teamId}
                  className={cn(
                    "relative border-b border-border-subtle/50 last:border-0",
                    row.isUserTeam && "bg-gold/10"
                  )}
                >
                  <td className="relative px-3 py-2 text-text-tertiary">
                    <span
                      className={cn(
                        "absolute inset-y-0 left-0 w-[3px]",
                        isContinental ? "bg-success" : isRelegation ? "bg-danger" : "bg-transparent"
                      )}
                    />
                    <span className="pl-1">{position}</span>
                  </td>
                  <td className={cn("truncate px-2 py-2", row.isUserTeam ? "font-semibold text-gold" : "text-text-secondary")}>
                    {row.teamName}
                  </td>
                  <td className={cn("px-1.5 py-2 text-center text-sm font-bold", row.isUserTeam ? "text-gold" : "text-text-primary")}>
                    {row.points}
                  </td>
                  <td className="px-1.5 py-2 text-center text-text-tertiary">{row.played}</td>
                  <td className="px-1.5 py-2 text-center text-text-tertiary">{row.wins}</td>
                  <td className="px-1.5 py-2 text-center text-text-tertiary">{row.draws}</td>
                  <td className="px-1.5 py-2 text-center text-text-tertiary">{row.losses}</td>
                  <td className="px-1.5 py-2 text-center text-text-tertiary">{row.goalsFor - row.goalsAgainst}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-4 border-t border-border-subtle px-3 py-2 font-sans text-[10px] text-text-tertiary">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-sm bg-success" /> Classificação continental
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-sm bg-danger" /> Rebaixamento
        </span>
      </div>
    </div>
  );
}
