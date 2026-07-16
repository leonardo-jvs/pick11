import { StandingRow } from "@/types/match";
import { cn } from "@/lib/utils";

export function StandingsTable({ standings }: { standings: StandingRow[] }) {
  return (
    <div className="overflow-x-auto rounded-card border border-border-subtle bg-surface">
      <table className="w-full font-mono text-xs">
        <thead>
          <tr className="border-b border-border-subtle text-text-tertiary">
            <th className="px-2 py-2 text-left">#</th>
            <th className="px-2 py-2 text-left">Clube</th>
            <th className="px-1.5 py-2">P</th>
            <th className="px-1.5 py-2">J</th>
            <th className="px-1.5 py-2">V</th>
            <th className="px-1.5 py-2">E</th>
            <th className="px-1.5 py-2">D</th>
            <th className="px-1.5 py-2">SG</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((row, i) => (
            <tr key={row.teamId} className={cn("border-b border-border-subtle/50 last:border-0", row.isUserTeam && "bg-gold/10")}>
              <td className="px-2 py-1.5 text-text-tertiary">{i + 1}</td>
              <td className={cn("truncate px-2 py-1.5", row.isUserTeam ? "font-semibold text-gold" : "text-text-secondary")}>
                {row.teamName}
              </td>
              <td className="px-1.5 py-1.5 text-center font-semibold text-text-primary">{row.points}</td>
              <td className="px-1.5 py-1.5 text-center text-text-tertiary">{row.played}</td>
              <td className="px-1.5 py-1.5 text-center text-text-tertiary">{row.wins}</td>
              <td className="px-1.5 py-1.5 text-center text-text-tertiary">{row.draws}</td>
              <td className="px-1.5 py-1.5 text-center text-text-tertiary">{row.losses}</td>
              <td className="px-1.5 py-1.5 text-center text-text-tertiary">{row.goalsFor - row.goalsAgainst}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
