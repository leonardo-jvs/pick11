"use client";

import { useRouter } from "next/navigation";
import { Screen } from "@/components/layout/Screen";
import { StandingsTable } from "@/components/features/league/StandingsTable";
import { useSessionStore } from "@/store/sessionStore";
import { computeStandings } from "@/services/leagueService";

export default function StandingsPage() {
  const router = useRouter();
  const room = useSessionStore((s) => s.room);
  const teams = useSessionStore((s) => s.teams);
  const matches = useSessionStore((s) => s.matches);
  const userTeam = useSessionStore((s) => s.userTeam());

  if (!room || !userTeam) {
    return (
      <Screen center>
        <p className="font-sans text-sm text-text-secondary">Nenhuma liga em andamento.</p>
      </Screen>
    );
  }

  const standings = computeStandings(teams, matches, userTeam.id);

  return (
    <Screen>
      <h1 className="mb-4 font-display text-2xl tracking-wide text-text-primary">Classificação</h1>
      <StandingsTable standings={standings} />
      <button onClick={() => router.back()} className="mt-6 block text-center font-sans text-sm text-gold">
        Voltar
      </button>
    </Screen>
  );
}
