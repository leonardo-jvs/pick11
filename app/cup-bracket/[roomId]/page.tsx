"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Trophy } from "lucide-react";
import { Screen } from "@/components/layout/Screen";
import { useSessionStore } from "@/store/sessionStore";
import { getPhaseLabel } from "@/services/cupService";
import { fetchCompetitionState } from "@/services/competitionSyncService";
import { fetchRoom } from "@/services/roomService";
import { ensureAnonymousSession } from "@/lib/supabase/auth";
import { useCompetitionRealtime } from "@/hooks/useCompetitionRealtime";
import { toast } from "@/store/toastStore";
import { ROUTES } from "@/constants/routes";
import { CupPhase } from "@/types/cup";
import { cn } from "@/lib/utils";

const PHASE_ORDER: Exclude<CupPhase, "groups" | "finished">[] = ["quarterfinal", "semifinal", "final"];

export default function CupBracketPage() {
  const router = useRouter();
  const params = useParams<{ roomId: string }>();
  const room = useSessionStore((s) => s.room);
  const setRoom = useSessionStore((s) => s.setRoom);
  const setSelfParticipantId = useSessionStore((s) => s.setSelfParticipantId);
  const teams = useSessionStore((s) => s.teams);
  const cupState = useSessionStore((s) => s.cupState);
  const userTeam = useSessionStore((s) => s.userTeam());
  const [reconnecting, setReconnecting] = useState(true);

  // Reconexão + tempo real: o chaveamento é frequentemente aberto no meio do
  // torneio (outros confrontos daquela fase ainda podem estar sendo
  // decididos) — sem isso, a tela ficava parada na foto do momento em que
  // foi aberta, e um F5 deixava a store vazia pra sempre.
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

  if (!room || !cupState) {
    return (
      <Screen center>
        <p className="font-sans text-sm text-text-secondary">Nenhuma Copa em andamento.</p>
      </Screen>
    );
  }

  const clubName = (teamId: string | null) => (teamId ? teams.find((t) => t.id === teamId)?.clubName ?? "—" : "A definir");
  const phasesInPlay = PHASE_ORDER.filter((phase) => cupState.knockout.some((m) => m.phase === phase));

  return (
    <Screen>
      <button
        onClick={() => router.back()}
        className="mb-4 flex items-center gap-1.5 font-sans text-xs text-text-tertiary transition-colors hover:text-text-primary"
      >
        <ArrowLeft size={14} />
        Voltar
      </button>

      <h1 className="mb-1 font-display text-3xl tracking-wide text-text-primary">Chaveamento</h1>
      <p className="mb-6 font-sans text-xs text-text-tertiary">{getPhaseLabel(cupState.phase)} em andamento</p>

      <div className="space-y-6">
        {phasesInPlay.map((phase) => (
          <div key={phase}>
            <p className="mb-2 flex items-center gap-1.5 font-sans text-xs font-semibold uppercase tracking-wide text-text-tertiary">
              {phase === "final" && <Trophy size={12} className="text-gold" />}
              {getPhaseLabel(phase)}
            </p>
            <div className="space-y-2">
              {cupState.knockout
                .filter((m) => m.phase === phase)
                .sort((a, b) => a.slot - b.slot)
                .map((match) => {
                  const homeName = clubName(match.homeId);
                  const awayName = clubName(match.awayId);
                  const isUserMatch = match.homeId === userTeam?.id || match.awayId === userTeam?.id;
                  return (
                    <div
                      key={match.id}
                      className={cn(
                        "rounded-card border p-3",
                        isUserMatch ? "border-gold/40 bg-gold/5" : "border-border-subtle bg-surface"
                      )}
                    >
                      <div className="flex items-center justify-between font-sans text-sm">
                        <span className={cn("truncate", match.winnerId === match.homeId ? "font-semibold text-gold" : "text-text-secondary")}>
                          {homeName}
                        </span>
                        <span className="mx-2 shrink-0 font-mono text-xs text-text-tertiary">vs</span>
                        <span className={cn("truncate text-right", match.winnerId === match.awayId ? "font-semibold text-gold" : "text-text-secondary")}>
                          {awayName}
                        </span>
                      </div>
                      {match.wentToPenalties && match.penaltyScore && (
                        <p className="mt-1 text-center font-mono text-[10px] text-teal-bright">
                          Pênaltis: {match.penaltyScore[0]} x {match.penaltyScore[1]}
                        </p>
                      )}
                      {!match.winnerId && <p className="mt-1 text-center font-mono text-[10px] text-text-tertiary">A definir</p>}
                    </div>
                  );
                })}
            </div>
          </div>
        ))}

        {phasesInPlay.length === 0 && (
          <p className="text-center font-sans text-sm text-text-tertiary">O chaveamento ainda não foi definido — termine a fase de grupos primeiro.</p>
        )}
      </div>
    </Screen>
  );
}
