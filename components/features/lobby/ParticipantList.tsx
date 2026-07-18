"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Crown } from "lucide-react";
import { RoomParticipant } from "@/types/team";
import { StatusDot } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

export function ParticipantList({
  participants,
  selfId,
  hostId,
  onlineUserIds,
}: {
  participants: RoomParticipant[];
  selfId: string | null;
  hostId: string;
  /** Presença em tempo real (Supabase Realtime Presence) — quando omitido, não mostra o indicador de conexão. */
  onlineUserIds?: Set<string>;
}) {
  return (
    <div className="flex flex-col gap-2.5">
      <AnimatePresence initial={false}>
        {participants.map((p) => {
          const isOnline = onlineUserIds ? onlineUserIds.has(p.id) : true;
          return (
            <motion.div
              key={p.id}
              layout
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                {p.id === hostId && <Crown size={13} className="text-gold" />}
                {onlineUserIds && (
                  <span
                    className={cn("size-1.5 shrink-0 rounded-full", isOnline ? "bg-success" : "bg-text-tertiary/40")}
                    title={isOnline ? "Conectado" : "Desconectado"}
                  />
                )}
                <div>
                  <p className={cn("font-sans text-sm text-text-primary", !isOnline && "opacity-50")}>
                    {p.name}
                    {p.id === selfId && <span className="text-text-tertiary"> (você)</span>}
                  </p>
                  <p className={cn("font-sans text-xs text-text-tertiary", !isOnline && "opacity-50")}>{p.clubName}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-sans text-xs text-text-tertiary">{p.isReady ? "Pronto" : "Aguardando"}</span>
                <StatusDot status={p.isReady ? "ready" : "waiting"} />
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
