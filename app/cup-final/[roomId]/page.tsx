"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion } from "framer-motion";
import { Trophy, Skull } from "lucide-react";
import { Screen } from "@/components/layout/Screen";
import { Button } from "@/components/ui/Button";
import { ROUTES } from "@/constants/routes";
import { useSessionStore } from "@/store/sessionStore";
import { getPhaseLabel } from "@/services/cupService";
import { fetchRoom } from "@/services/roomService";
import { ensureAnonymousSession } from "@/lib/supabase/auth";
import { toast } from "@/store/toastStore";
import { CupPhase } from "@/types/cup";

export default function CupFinalPage() {
  const router = useRouter();
  const params = useParams<{ roomId: string }>();
  const room = useSessionStore((s) => s.room);
  const setRoom = useSessionStore((s) => s.setRoom);
  const cupState = useSessionStore((s) => s.cupState);
  const setSelfParticipantId = useSessionStore((s) => s.setSelfParticipantId);
  const userTeam = useSessionStore((s) => s.userTeam());
  const teams = useSessionStore((s) => s.teams);
  const reset = useSessionStore((s) => s.reset);
  const [reconnecting, setReconnecting] = useState(true);

  // Reconexão: sem isso, um F5 nesta tela deixava a store vazia (ex: o
  // resultado/campanha do usuário não conseguiam ser calculados).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const user = await ensureAnonymousSession();
        if (!room || room.id !== params.roomId) {
          const freshRoom = await fetchRoom(params.roomId);
          if (cancelled) return;
          if (freshRoom) {
            setRoom(freshRoom);
            setSelfParticipantId(user.id);
          }
        }
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

  if (reconnecting) {
    return (
      <Screen center>
        <div className="size-6 animate-spin rounded-full border-2 border-border-strong border-t-gold" />
      </Screen>
    );
  }

  if (!room || !userTeam || !cupState) {
    return (
      <Screen center>
        <p className="font-sans text-sm text-text-secondary">Nenhuma Copa concluída ainda.</p>
      </Screen>
    );
  }

  const userMatches = cupState.knockout.filter((m) => m.homeId === userTeam.id || m.awayId === userTeam.id);
  const lastMatch = userMatches[userMatches.length - 1];
  const isChampion = !!lastMatch && lastMatch.phase === "final" && lastMatch.winnerId === userTeam.id;
  const eliminatedPhase: CupPhase = lastMatch ? lastMatch.phase : "groups";

  const runnerUpId = isChampion && lastMatch ? (lastMatch.homeId === userTeam.id ? lastMatch.awayId : lastMatch.homeId) : null;
  const runnerUpName = runnerUpId ? teams.find((t) => t.id === runnerUpId)?.clubName ?? "—" : null;

  function playAgain() {
    reset();
    router.push(ROUTES.menu);
  }

  return (
    <Screen center>
      <div className="w-full text-center">
        <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", duration: 0.6 }}>
          {isChampion ? <Trophy className="mx-auto mb-3 text-gold" size={44} /> : <Skull className="mx-auto mb-3 text-text-tertiary" size={40} />}
        </motion.div>
        <h1 className="font-display text-3xl tracking-wide text-text-primary">{isChampion ? "CAMPEÃO DA COPA!" : "FIM DE JORNADA"}</h1>
        <p className="mt-1 font-sans text-sm text-text-tertiary">{userTeam.clubName}</p>

        {isChampion ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mt-6 rounded-card border border-gold/40 bg-gradient-to-b from-gold/15 via-surface to-surface p-5 shadow-glow-gold"
          >
            <p className="font-sans text-[10px] uppercase tracking-wide text-text-tertiary">Você venceu a final contra</p>
            <p className="font-display text-2xl text-gold">{runnerUpName ?? "—"}</p>
            {lastMatch?.wentToPenalties && lastMatch.penaltyScore && (
              <p className="mt-1 font-mono text-xs text-teal-bright">
                Nos pênaltis: {lastMatch.penaltyScore[0]} x {lastMatch.penaltyScore[1]}
              </p>
            )}
          </motion.div>
        ) : (
          <div className="mt-6 rounded-card border border-danger/30 bg-danger/5 p-5">
            <p className="font-sans text-[10px] uppercase tracking-wide text-text-tertiary">Eliminado</p>
            <p className="font-display text-xl text-danger">{getPhaseLabel(eliminatedPhase)}</p>
            {lastMatch?.wentToPenalties && lastMatch.penaltyScore && (
              <p className="mt-1 font-mono text-xs text-text-tertiary">
                Perdeu nos pênaltis: {lastMatch.penaltyScore[0]} x {lastMatch.penaltyScore[1]}
              </p>
            )}
          </div>
        )}

        <div className="mt-8 space-y-2">
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
