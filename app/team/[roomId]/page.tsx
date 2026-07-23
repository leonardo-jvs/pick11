"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Users } from "lucide-react";
import { Screen } from "@/components/layout/Screen";
import { Button } from "@/components/ui/Button";
import { StarRating } from "@/components/ui/StarRating";
import { Modal } from "@/components/ui/Modal";
import { FormationPitch } from "@/components/features/league/FormationPitch";
import { ROUTES } from "@/constants/routes";
import { useSessionStore } from "@/store/sessionStore";
import { useRoomRealtime } from "@/hooks/useRoomRealtime";
import { fetchRoom } from "@/services/roomService";
import { fetchDraftState } from "@/services/draftSyncService";
import { ensureAnonymousSession } from "@/lib/supabase/auth";
import { toast } from "@/store/toastStore";
import { getFormationPanel } from "@/services/formationService";
import { computeTeamOverall, computeTeamCompatibilityStars } from "@/services/compatibilityService";
import { RoomParticipant } from "@/types/team";
import { Player } from "@/types/player";

function MiniPitch({ participant, filledSlots }: { participant: RoomParticipant; filledSlots: Record<string, Player> }) {
  const panel = getFormationPanel(participant.tactics.formation, filledSlots);
  const starters = panel.map((s) => s.player).filter((p): p is NonNullable<typeof p> => p !== null);
  const overall = computeTeamOverall(starters, participant.tactics);

  return (
    <div className="rounded-card border border-border-subtle bg-surface p-3">
      <div className="mb-2 flex items-center justify-between">
        <div>
          <p className="font-sans text-sm font-semibold text-text-primary">{participant.clubName}</p>
          <p className="font-sans text-[11px] text-text-tertiary">{participant.name}</p>
        </div>
        <div className="text-right">
          <p className="font-mono text-[10px] text-text-tertiary">{participant.tactics.formation}</p>
          <p className="font-display text-lg text-gold">{overall}</p>
        </div>
      </div>
      <FormationPitch formation={participant.tactics.formation} filledSlots={filledSlots} tactics={participant.tactics} size="sm" />
    </div>
  );
}

export default function TeamPage() {
  const router = useRouter();
  const params = useParams<{ roomId: string }>();
  const room = useSessionStore((s) => s.room);
  const setRoom = useSessionStore((s) => s.setRoom);
  const selfParticipantId = useSessionStore((s) => s.selfParticipantId);
  const setSelfParticipantId = useSessionStore((s) => s.setSelfParticipantId);
  const draftState = useSessionStore((s) => s.draftState);
  const setDraftState = useSessionStore((s) => s.setDraftState);
  const [showOthers, setShowOthers] = useState(false);
  const [reconnecting, setReconnecting] = useState(true);

  const self = room?.participants.find((p) => p.id === selfParticipantId);
  const hostId = room?.hostId;
  const isHost = !!self && self.id === hostId;
  const isSolo = !!room && room.participants.length <= 1;

  // Reconexão: sem isso, um F5 nesta tela deixava a store vazia pra sempre —
  // mesmo padrão já usado no Lobby, Draft, Pré-Partida e Simulação.
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
        if (!draftState) {
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

  // Mantém o status da sala sincronizado em tempo real — é a ÚNICA fonte de
  // verdade sobre "o administrador já gerou a competição". Nenhum cliente
  // navega sozinho por conta própria: todos esperam essa mudança real vinda
  // do banco antes de avançar juntos.
  useRoomRealtime(room?.id ?? null);

  useEffect(() => {
    if (!room) return;
    if (room.status === "in_league" || room.status === "in_cup") {
      router.push(ROUTES.generatingLeague(room.id));
    }
  }, [room, router]);

  if (reconnecting) {
    return (
      <Screen center>
        <div className="size-6 animate-spin rounded-full border-2 border-border-strong border-t-gold" />
      </Screen>
    );
  }

  if (!room || !draftState || !self) {
    return (
      <Screen center>
        <p className="font-sans text-sm text-text-secondary">Nenhum time para mostrar ainda.</p>
      </Screen>
    );
  }

  const filledSlots = draftState.filledSlots[self.id] ?? {};
  const panel = getFormationPanel(self.tactics.formation, filledSlots);
  const starters = panel.map((s) => s.player).filter((p): p is NonNullable<typeof p> => p !== null);

  const overall = computeTeamOverall(starters, self.tactics);
  const compatibilityStars = computeTeamCompatibilityStars(starters, self.tactics);
  const physicalInitial = 100;

  const otherParticipants = room.participants.filter((p) => p.id !== self.id && draftState.order.includes(p.id));

  return (
    <Screen withField>
      <h1 className="mb-1 font-display text-3xl tracking-wide text-text-primary">{self.clubName}</h1>
      <p className="mb-6 font-sans text-sm text-text-tertiary">Resumo do Draft · {self.tactics.formation}</p>

      <FormationPitch
        formation={self.tactics.formation}
        filledSlots={filledSlots}
        tactics={self.tactics}
        className="mb-6"
      />

      <div className="mb-4 grid grid-cols-3 gap-2">
        <div className="rounded-card border border-border-subtle bg-surface p-3 text-center">
          <p className="font-sans text-[10px] text-text-tertiary">Overall do time</p>
          <p className="font-display text-2xl text-gold">{overall}</p>
        </div>
        <div className="rounded-card border border-border-subtle bg-surface p-3 text-center">
          <p className="mb-1 font-sans text-[10px] text-text-tertiary">Compatibilidade</p>
          <StarRating value={compatibilityStars} max={3} size="sm" className="justify-center" />
        </div>
        <div className="rounded-card border border-border-subtle bg-surface p-3 text-center">
          <p className="font-sans text-[10px] text-text-tertiary">Físico inicial</p>
          <p className="font-display text-2xl text-teal-bright">{physicalInitial}%</p>
        </div>
      </div>

      {!isSolo && otherParticipants.length > 0 && (
        <Button variant="secondary" fullWidth icon={<Users size={16} />} className="mb-6" onClick={() => setShowOthers(true)}>
          Ver escalações dos outros treinadores
        </Button>
      )}

      {isSolo || isHost ? (
        <Button fullWidth size="lg" onClick={() => router.push(ROUTES.generatingLeague(room.id))}>
          {room.gameMode === "cup"
            ? "Gerar Copa"
            : room.gameMode === "league_knockout"
              ? "Gerar Liga + Mata-Mata"
              : room.gameMode === "x1"
                ? "Iniciar X1"
                : "Gerar Liga"}
        </Button>
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-card border border-border-subtle bg-surface p-5 text-center">
          <div className="size-6 animate-spin rounded-full border-2 border-border-strong border-t-gold" />
          <p className="font-sans text-sm text-text-secondary">
            Aguardando o administrador da sala iniciar a liga...
          </p>
        </div>
      )}

      <Modal isOpen={showOthers} onClose={() => setShowOthers(false)} title="Escalações da sala">
        <div className="max-h-[70vh] space-y-3 overflow-y-auto pr-1">
          {otherParticipants.map((participant) => (
            <MiniPitch key={participant.id} participant={participant} filledSlots={draftState.filledSlots[participant.id] ?? {}} />
          ))}
        </div>
      </Modal>
    </Screen>
  );
}
