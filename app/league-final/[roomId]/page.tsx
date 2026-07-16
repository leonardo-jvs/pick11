"use client";

import { useRouter } from "next/navigation";
import { Trophy } from "lucide-react";
import { Screen } from "@/components/layout/Screen";
import { Button } from "@/components/ui/Button";
import { ROUTES } from "@/constants/routes";
import { useSessionStore } from "@/store/sessionStore";
import { computeStandings, computeTopScorers, computeBestDefenses } from "@/services/leagueService";

export default function LeagueFinalPage() {
  const router = useRouter();
  const room = useSessionStore((s) => s.room);
  const teams = useSessionStore((s) => s.teams);
  const matches = useSessionStore((s) => s.matches);
  const userTeam = useSessionStore((s) => s.userTeam());
  const reset = useSessionStore((s) => s.reset);

  if (!room || !userTeam) {
    return (
      <Screen center>
        <p className="font-sans text-sm text-text-secondary">Nenhuma liga concluída ainda.</p>
      </Screen>
    );
  }

  const standings = computeStandings(teams, matches, userTeam.id);
  const champion = standings[0];
  const userPosition = standings.findIndex((s) => s.teamId === userTeam.id) + 1;
  const topScorers = computeTopScorers(matches, 1);
  const bestDefenses = computeBestDefenses(standings, 1);
  const relegated = standings.slice(-4);

  function playAgain() {
    reset();
    router.push(ROUTES.menu);
  }

  return (
    <Screen center>
      <div className="w-full text-center">
        <Trophy className="mx-auto mb-3 text-gold" size={40} />
        <h1 className="font-display text-3xl tracking-wide text-text-primary">FIM DE LIGA</h1>
        <p className="mt-1 font-sans text-sm text-text-tertiary">Temporada encerrada</p>

        <div className="mt-6 rounded-card border border-gold/40 bg-gold/10 p-5">
          <p className="font-sans text-[10px] uppercase tracking-wide text-text-tertiary">Campeão</p>
          <p className="font-display text-2xl text-gold">{champion?.teamName ?? "—"}</p>
          <p className="font-mono text-xs text-text-tertiary">{champion?.points ?? 0} pontos</p>
        </div>

        <div className="mt-4 rounded-card border border-border-subtle bg-surface p-4">
          <p className="font-sans text-[10px] uppercase tracking-wide text-text-tertiary">Sua campanha</p>
          <p className="font-display text-xl text-text-primary">{userPosition}º lugar</p>
          <p className="font-mono text-xs text-text-tertiary">{userTeam.clubName}</p>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-card border border-border-subtle bg-surface p-3 text-center">
            <p className="font-sans text-[10px] text-text-tertiary">Artilheiro</p>
            <p className="truncate font-sans text-sm font-semibold text-text-primary">{topScorers[0]?.playerName ?? "—"}</p>
            <p className="font-mono text-xs text-teal-bright">{topScorers[0]?.goals ?? 0} gols</p>
          </div>
          <div className="rounded-card border border-border-subtle bg-surface p-3 text-center">
            <p className="font-sans text-[10px] text-text-tertiary">Melhor defesa</p>
            <p className="truncate font-sans text-sm font-semibold text-text-primary">{bestDefenses[0]?.teamName ?? "—"}</p>
            <p className="font-mono text-xs text-teal-bright">{bestDefenses[0]?.goalsConceded ?? 0} sofridos</p>
          </div>
        </div>

        <div className="mt-4 rounded-card border border-danger/30 bg-danger/5 p-4">
          <p className="mb-2 font-sans text-[10px] uppercase tracking-wide text-text-tertiary">Rebaixados</p>
          <div className="space-y-1.5">
            {relegated.map((row, i) => (
              <p key={row.teamId} className="flex items-center justify-between font-sans text-sm">
                <span className="text-text-secondary">
                  ⬇️ {standings.length - relegated.length + i + 1}º {row.teamName}
                </span>
                {row.isUserTeam && <span className="font-mono text-[10px] text-danger">Você</span>}
              </p>
            ))}
          </div>
        </div>

        <div className="mt-6 space-y-2">
          <Button fullWidth size="lg" onClick={playAgain}>
            Jogar novamente
          </Button>
          <Button fullWidth variant="secondary" onClick={() => router.push(ROUTES.menu)}>
            Voltar ao menu
          </Button>
        </div>
      </div>
    </Screen>
  );
}
