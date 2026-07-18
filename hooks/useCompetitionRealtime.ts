"use client";

import { useEffect } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { fetchCompetitionState } from "@/services/competitionSyncService";
import { useSessionStore } from "@/store/sessionStore";

/**
 * Mantém a Liga/Copa sincronizada: sempre que o host grava o resultado de uma
 * rodada (ou alguém confirma presença), todo mundo na sala recebe a
 * atualização automaticamente via Realtime.
 */
export function useCompetitionRealtime(roomId: string | null) {
  const setTeams = useSessionStore((s) => s.setTeams);
  const setSchedule = useSessionStore((s) => s.setSchedule);
  const setCupState = useSessionStore((s) => s.setCupState);
  const setMatches = useSessionStore((s) => s.setMatches);
  const setCurrentRound = useSessionStore((s) => s.setCurrentRound);
  const setCompetitionSync = useSessionStore((s) => s.setCompetitionSync);

  useEffect(() => {
    if (!roomId) return;
    const supabase = getSupabaseClient();
    let cancelled = false;
    // `version` só incrementa quando uma escrita de verdade é aceita (é a
    // mesma trava otimista usada pra concorrência) — reaproveitar esse número
    // pra pular re-renderizações quando o evento recebido não trouxe nada
    // novo (ex: reconexão do Realtime reenviando o mesmo snapshot).
    let lastAppliedVersion: number | null = null;

    async function refresh() {
      try {
        const snapshot = await fetchCompetitionState(roomId!);
        if (cancelled || !snapshot) return;
        if (lastAppliedVersion === snapshot.version) return;
        lastAppliedVersion = snapshot.version;

        setTeams(snapshot.teams);
        if (snapshot.schedule) setSchedule(snapshot.schedule);
        if (snapshot.cupState) setCupState(snapshot.cupState);
        setMatches(snapshot.matches);
        setCurrentRound(snapshot.currentRound);
        setCompetitionSync(snapshot.version, snapshot.roundDeadline, snapshot.roundReadiness);
      } catch {
        // Falha pontual de rede — o próximo evento Realtime tenta de novo.
      }
    }

    refresh();

    const channel = supabase
      .channel(`competition-db:${roomId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "competition_states", filter: `room_id=eq.${roomId}` }, refresh)
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [roomId, setTeams, setSchedule, setCupState, setMatches, setCurrentRound, setCompetitionSync]);
}
