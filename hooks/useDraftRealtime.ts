"use client";

import { useEffect } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { fetchDraftState } from "@/services/draftSyncService";
import { useSessionStore } from "@/store/sessionStore";

/**
 * Mantém o Draft sincronizado: qualquer mudança em `draft_states` para esta
 * sala (alguém confirmou um pick, um turno expirou e foi auto-resolvido)
 * chega pra todo mundo automaticamente via Realtime. Todos os participantes
 * enxergam exatamente o mesmo Draft, ao mesmo tempo.
 */
export function useDraftRealtime(roomId: string | null) {
  const setDraftState = useSessionStore((s) => s.setDraftState);
  const setDraftSync = useSessionStore((s) => s.setDraftSync);

  useEffect(() => {
    if (!roomId) return;
    const supabase = getSupabaseClient();
    let cancelled = false;
    let lastAppliedVersion: number | null = null;

    async function refresh() {
      try {
        const snapshot = await fetchDraftState(roomId!);
        if (cancelled || !snapshot) return;
        if (lastAppliedVersion === snapshot.version) return;
        lastAppliedVersion = snapshot.version;

        setDraftState(snapshot.state);
        setDraftSync(snapshot.version, snapshot.deadline);
      } catch {
        // Falha pontual de rede — o próximo evento Realtime tenta de novo.
      }
    }

    refresh();

    const channel = supabase
      .channel(`draft-db:${roomId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "draft_states", filter: `room_id=eq.${roomId}` }, refresh)
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [roomId, setDraftState, setDraftSync]);
}
