"use client";

import { useEffect } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { fetchRoom } from "@/services/roomService";
import { useSessionStore } from "@/store/sessionStore";

/**
 * Mantém a sala sincronizada em tempo real via Supabase Realtime: qualquer
 * INSERT/UPDATE/DELETE em `rooms` ou `room_participants` para esta sala
 * dispara um refetch e atualiza o Zustand. Todo mundo na sala vê a mesma
 * coisa automaticamente, sem precisar dar F5.
 *
 * Fase 1: refetch simples da sala inteira a cada mudança (poucos participantes,
 * eventos raros — o custo é desprezível). Uma otimização futura poderia
 * aplicar o payload do evento diretamente no estado em vez de refazer a
 * consulta, se a sala crescer muito.
 */
export function useRoomRealtime(roomId: string | null) {
  const setRoom = useSessionStore((s) => s.setRoom);

  useEffect(() => {
    if (!roomId) return;
    const supabase = getSupabaseClient();
    let cancelled = false;
    // rooms não tem um contador de versão como draft_states/competition_states
    // — usa uma comparação leve do conteúdo (payload pequeno: sala + poucos
    // participantes) pra evitar re-renderizações quando o evento recebido não
    // trouxe nada de fato diferente.
    let lastAppliedSnapshot: string | null = null;

    async function refresh() {
      try {
        const room = await fetchRoom(roomId!);
        if (cancelled || !room) return;
        const snapshot = JSON.stringify(room);
        if (lastAppliedSnapshot === snapshot) return;
        lastAppliedSnapshot = snapshot;
        setRoom(room);
      } catch {
        // Falha pontual de rede — o próximo evento realtime (ou o polling do
        // próprio Supabase ao reconectar o websocket) tenta de novo sozinho.
      }
    }

    refresh();

    const channel = supabase
      .channel(`room-db:${roomId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "rooms", filter: `id=eq.${roomId}` }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "room_participants", filter: `room_id=eq.${roomId}` }, refresh)
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [roomId, setRoom]);
}
