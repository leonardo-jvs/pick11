"use client";

import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";

/**
 * Rastreia quem está online agora numa sala, via Supabase Realtime Presence.
 * Diferente de `room_participants` (que é persistido — quem JÁ ENTROU na
 * sala), presença é efêmera: reflete quem está com a aba aberta neste exato
 * momento. Some sozinho quando a aba fecha ou a conexão cai, sem precisar de
 * nenhuma lógica de "heartbeat" manual — o Supabase cuida disso.
 */
export function useRoomPresence(roomId: string | null, userId: string | null): Set<string> {
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!roomId || !userId) return;
    const supabase = getSupabaseClient();
    const channel = supabase.channel(`room-presence:${roomId}`, {
      config: { presence: { key: userId } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        setOnlineUserIds(new Set(Object.keys(channel.presenceState())));
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ online_at: new Date().toISOString() });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, userId]);

  return onlineUserIds;
}
