"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Screen } from "@/components/layout/Screen";
import { StandingsTable } from "@/components/features/league/StandingsTable";
import { useSessionStore } from "@/store/sessionStore";
import { computeStandings } from "@/services/leagueService";
import { fetchCompetitionState } from "@/services/competitionSyncService";
import { fetchRoom } from "@/services/roomService";
import { ensureAnonymousSession } from "@/lib/supabase/auth";
import { useCompetitionRealtime } from "@/hooks/useCompetitionRealtime";
import { toast } from "@/store/toastStore";
import { ROUTES } from "@/constants/routes";
import { LEAGUE_CONFIG } from "@/constants/game";

export default function StandingsPage() {
  const router = useRouter();
  const params = useParams<{ roomId: string }>();
  const room = useSessionStore((s) => s.room);
  const setRoom = useSessionStore((s) => s.setRoom);
  const setSelfParticipantId = useSessionStore((s) => s.setSelfParticipantId);
  const teams = useSessionStore((s) => s.teams);
  const matches = useSessionStore((s) => s.matches);
  const currentRound = useSessionStore((s) => s.currentRound);
  const userTeam = useSessionStore((s) => s.userTeam());
  const [reconnecting, setReconnecting] = useState(true);

  // Reconexão + tempo real: essa tela pode ser aberta no meio de uma
  // competição em andamento — sem isso, um F5 aqui deixava a store vazia pra
  // sempre, e a classificação nunca atualizava sozinha se alguém ficasse
  // olhando enquanto outra rodada era simulada em outro cliente.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const user = await ensureAnonymousSession();
        let currentRoom = room;
        if (!currentRoom || currentRoom.id !== params.roomId) {
          const freshRoom = await fetchRoom(params.roomId);
          if (cancelled) return;
          if (!freshRoom) {
            toast.urgent("Essa sala não existe mais.");
            router.push(ROUTES.roomHub);
            return;
          }
          currentRoom = freshRoom;
          setRoom(freshRoom);
          setSelfParticipantId(user.id);
        }
        await fetchCompetitionState(currentRoom.id);
      } catch (e) {
        toast.urgent(e instanceof Error ? e.message : "Não foi possível conectar.");
      } finally {
        if (!cancelled) setReconnecting(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.roomId]);

  useCompetitionRealtime(room?.id ?? null);

  if (reconnecting) {
    return (
      <Screen center>
        <div className="size-6 animate-spin rounded-full border-2 border-border-strong border-t-gold" />
      </Screen>
    );
  }

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
