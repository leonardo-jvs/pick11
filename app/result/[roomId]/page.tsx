"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Screen } from "@/components/layout/Screen";
import { Button } from "@/components/ui/Button";
import { ROUTES } from "@/constants/routes";
import { LEAGUE_CONFIG } from "@/constants/game";
import { useSessionStore } from "@/store/sessionStore";

export default function ResultPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const round = Number(searchParams.get("round") ?? 0);

  const room = useSessionStore((s) => s.room);
  const matches = useSessionStore((s) => s.matches);
  const currentRound = useSessionStore((s) => s.currentRound);
  const userTeam = useSessionStore((s) => s.userTeam());

  const match = [...matches].reverse().find((m) => m.round === round && m.isUserMatch);

  if (!room || !userTeam || !match) {
    return (
      <Screen center>
        <p className="font-sans text-sm text-text-secondary">Nenhum resultado para mostrar.</p>
      </Screen>
    );
  }

  const isHome = match.homeTeamId === userTeam.id;
  const userScore = isHome ? match.homeScore : match.awayScore;
  const opponentScore = isHome ? match.awayScore : match.homeScore;
  const outcome = userScore > opponentScore ? "Vitória" : userScore < opponentScore ? "Derrota" : "Empate";
  const outcomeColor = outcome === "Vitória" ? "text-success" : outcome === "Derrota" ? "text-danger" : "text-warning";

  const goals = match.events.filter((e) => e.type === "goal");
  const isLastRound = round >= LEAGUE_CONFIG.TOTAL_ROUNDS;

  return (
    <Screen center>
      <div className="w-full">
        <p className={`mb-1 text-center font-sans text-sm font-semibold ${outcomeColor}`}>{outcome}</p>
        <p className="mb-4 text-center font-sans text-xs text-text-tertiary">Rodada {round}</p>

        <div className="mb-5 flex items-center justify-center gap-4 rounded-card border border-border-subtle bg-surface p-5">
          <div className="flex-1 text-center">
            <p className="truncate font-sans text-sm text-text-secondary">{match.homeTeamName}</p>
          </div>
          <p className="font-display text-4xl text-text-primary">
            {match.homeScore} <span className="text-text-tertiary">-</span> {match.awayScore}
          </p>
          <div className="flex-1 text-center">
            <p className="truncate font-sans text-sm text-text-secondary">{match.awayTeamName}</p>
          </div>
        </div>

        {goals.length > 0 && (
          <div className="mb-5 rounded-card border border-border-subtle bg-surface p-3">
            <p className="mb-2 font-sans text-[10px] uppercase tracking-wide text-text-tertiary">Gols</p>
            <div className="space-y-1">
              {goals.map((g) => (
                <p key={g.id} className="font-sans text-xs text-text-secondary">
                  <span className="font-mono text-text-tertiary">{g.minute}&apos;</span>{" "}
                  <span className="text-text-primary">{g.playerName}</span> ({g.team === "home" ? match.homeTeamName : match.awayTeamName})
                  {g.secondaryPlayerName && <span className="text-text-tertiary"> · assist. {g.secondaryPlayerName}</span>}
                </p>
              ))}
            </div>
          </div>
        )}

        <div className="mb-5 grid grid-cols-3 gap-2 text-center font-mono text-[11px] text-text-tertiary">
          <div className="rounded-card border border-border-subtle bg-surface p-2">
            <p className="text-text-primary">{match.stats.possession}%</p>
            <p>Posse</p>
          </div>
          <div className="rounded-card border border-border-subtle bg-surface p-2">
            <p className="text-text-primary">
              {match.stats.shots[0]}-{match.stats.shots[1]}
            </p>
            <p>Finalizações</p>
          </div>
          <div className="rounded-card border border-border-subtle bg-surface p-2">
            <p className="text-text-primary">{match.manOfTheMatch}</p>
            <p>Destaque</p>
          </div>
        </div>

        <div className="space-y-2">
          {isLastRound ? (
            <Button fullWidth size="lg" onClick={() => router.push(ROUTES.leagueFinal(room.id))}>
              Ver final da liga
            </Button>
          ) : (
            <Button fullWidth size="lg" onClick={() => router.push(ROUTES.preMatch(room.id, currentRound))}>
              Próxima rodada
            </Button>
          )}
          <Button fullWidth variant="secondary" onClick={() => router.push(ROUTES.standings(room.id))}>
            Ver classificação
          </Button>
        </div>
      </div>
    </Screen>
  );
}
