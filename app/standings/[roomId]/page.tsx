"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Screen } from "@/components/layout/Screen";
import { StandingsTable } from "@/components/features/league/StandingsTable";
import { useSessionStore } from "@/store/sessionStore";
import { computeStandings } from "@/services/leagueService";
import { LEAGUE_CONFIG } from "@/constants/game";

export default function StandingsPage() {
  const router = useRouter();
  const room = useSessionStore((s) => s.room);
  const teams = useSessionStore((s) => s.teams);
  const matches = useSessionStore((s) => s.matches);
  const currentRound = useSessionStore((s) => s.currentRound);
  const userTeam = useSessionStore((s) => s.userTeam());

  if (!room || !userTeam) {
    return (
      <Screen center>
        <p className="font-sans text-sm text-text-secondary">Nenhuma liga em andamento.</p>
      </Screen>
    );
  }

  const standings = computeStandings(teams, matches, userTeam.id);
  const userPosition = standings.findIndex((s) => s.isUserTeam) + 1;

  return (
    <Screen>
      <button
        onClick={() => router.back()}
        className="mb-4 flex items-center gap-1.5 font-sans text-xs text-text-tertiary transition-colors hover:text-text-primary"
      >
        <ArrowLeft size={14} />
        Voltar
      </button>

      <div className="mb-5 flex items-end justify-between">
        <div>
          <h1 className="font-display text-3xl tracking-wide text-text-primary">Classificação</h1>
          <p className="font-sans text-xs text-text-tertiary">
            Rodada {Math.min(currentRound, LEAGUE_CONFIG.TOTAL_ROUNDS)} de {LEAGUE_CONFIG.TOTAL_ROUNDS}
          </p>
        </div>
        <div className="text-right">
          <p className="font-sans text-[10px] uppercase tracking-wide text-text-tertiary">Sua posição</p>
          <p className="font-display text-2xl text-gold">{userPosition}º</p>
        </div>
      </div>

      <StandingsTable standings={standings} />
    </Screen>
  );
}
