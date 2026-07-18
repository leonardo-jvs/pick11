"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Screen } from "@/components/layout/Screen";
import { ROUTES } from "@/constants/routes";
import { useSessionStore } from "@/store/sessionStore";
import { startCompetitionOnServer } from "@/services/competitionSyncService";
import { fetchDraftState } from "@/services/draftSyncService";
import { fetchRoom } from "@/services/roomService";
import { ensureAnonymousSession } from "@/lib/supabase/auth";
import { useRoomRealtime } from "@/hooks/useRoomRealtime";
import { toast } from "@/store/toastStore";
import { cn } from "@/lib/utils";

const LEAGUE_STEPS = [
  "Montando os elencos...",
  "Distribuindo reservas...",
  "Calculando compatibilidades...",
  "Gerando calendário...",
  "Preparando estádio...",
];

const CUP_STEPS = [
  "Montando os elencos...",
  "Distribuindo reservas...",
  "Calculando compatibilidades...",
  "Sorteando os grupos...",
  "Preparando estádio...",
];

const STEP_DURATION_MS = 600; // 5 passos x 600ms ≈ 3s

export default function GeneratingLeaguePage() {
  const router = useRouter();
  const params = useParams<{ roomId: string }>();
  const room = useSessionStore((s) => s.room);
  const setRoom = useSessionStore((s) => s.setRoom);
  const draftState = useSessionStore((s) => s.draftState);
  const setDraftState = useSessionStore((s) => s.setDraftState);
  const selfParticipantId = useSessionStore((s) => s.selfParticipantId);
  const setSelfParticipantId = useSessionStore((s) => s.setSelfParticipantId);

  const isCup = room?.gameMode === "cup";
  const STEPS = isCup ? CUP_STEPS : LEAGUE_STEPS;
  const isHost = !!room && room.hostId === selfParticipantId;

  const [stepIndex, setStepIndex] = useState(0);
  const [reconnecting, setReconnecting] = useState(true);
  const startedRef = useRef(false);
  const cancelledRef = useRef(false);

  // Se o usuário sair desta tela no meio da geração, interrompe a cadeia
  // antes do próximo passo — nunca navega depois que o componente já foi
  // desmontado.
  useEffect(() => {
    return () => {
      cancelledRef.current = true;
    };
  }, []);

  // Reconexão: essa tela dependia inteiramente do que já estivesse na store
  // vindo da navegação normal (Draft -> pós-Draft -> aqui). Se `room` ou
  // `draftState` estiverem ausentes por qualquer motivo (ex: F5 nesta tela,
  // ou uma condição de corrida deixando a store incompleta), busca os dois
  // direto do Supabase antes de decidir se deve gerar a competição — em vez
  // de travar silenciosamente na primeira etapa pra sempre.
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
        if (!draftState && currentRoom.status === "drafting") {
          const snapshot = await fetchDraftState(currentRoom.id);
          if (cancelled) return;
          if (snapshot?.state.isComplete) setDraftState(snapshot.state);
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

  // Sincroniza a sala — os participantes que não são host esperam
  // `room.status` mudar (o host grava isso ao terminar de gerar a competição).
  useRoomRealtime(room?.id ?? null);

  useEffect(() => {
    if (reconnecting || !room || startedRef.current) return;

    if (room.status === "in_league" || room.status === "in_cup") {
      startedRef.current = true;
      router.push(ROUTES.preMatch(room.id, 1));
      return;
    }

    if (!isHost || !draftState) return;
    startedRef.current = true;

    (async () => {
      for (let i = 0; i < STEPS.length - 1; i++) {
        setStepIndex(i);
        await new Promise((r) => setTimeout(r, STEP_DURATION_MS));
        if (cancelledRef.current) return;
      }
      setStepIndex(STEPS.length - 1);
      await new Promise((r) => setTimeout(r, STEP_DURATION_MS));
      if (cancelledRef.current) return;

      try {
        // O deadline da primeira rodada é gravado AQUI DENTRO — feito o mais
        // perto possível da navegação, sem nenhuma pausa cosmética depois,
        // pra não desperdiçar tempo do cronômetro compartilhado com latência
        // evitável.
        await startCompetitionOnServer(room, draftState);
        if (cancelledRef.current) return;
        router.push(ROUTES.preMatch(room.id, 1));
      } catch (e) {
        toast.urgent(e instanceof Error ? e.message : "Não foi possível gerar a competição.");
        startedRef.current = false;
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reconnecting, room?.status, isHost, draftState]);

  const progress = ((stepIndex + 1) / STEPS.length) * 100;

  if (reconnecting) {
    return (
      <Screen center>
        <div className="size-6 animate-spin rounded-full border-2 border-border-strong border-t-gold" />
      </Screen>
    );
  }

  return (
    <Screen center withField>
      <div className="w-full max-w-xs text-center">
        <p className="font-display text-2xl tracking-wide text-text-primary">{isCup ? "GERANDO COPA" : "GERANDO LIGA"}</p>
        <p className="mt-2 min-h-[20px] font-sans text-sm text-text-tertiary">{STEPS[stepIndex]}</p>

        <div className="mt-6 h-1.5 w-full overflow-hidden rounded-pill bg-surface-elevated">
          <div
            className="h-full rounded-pill bg-gold transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="mt-4 flex justify-center gap-1.5">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={cn(
                "size-1.5 rounded-full transition-colors duration-300",
                i <= stepIndex ? "bg-gold" : "bg-surface-elevated"
              )}
            />
          ))}
        </div>
      </div>
    </Screen>
  );
}
