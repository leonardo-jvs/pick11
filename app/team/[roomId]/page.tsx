"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Users } from "lucide-react";
import { Screen } from "@/components/layout/Screen";
import { Button } from "@/components/ui/Button";
import { StarRating } from "@/components/ui/StarRating";
import { Modal } from "@/components/ui/Modal";
import { ROUTES } from "@/constants/routes";
import { useSessionStore } from "@/store/sessionStore";
import { getFormationPanel } from "@/services/formationService";
import { computeTeamOverall, computeTeamCompatibilityStars, toDraftPlayerCard } from "@/services/compatibilityService";
import { RoomParticipant } from "@/types/team";
import { Player } from "@/types/player";

const ROW_GROUPS: { title: string; row: "ataque" | "meio" | "defesa" | "goleiro" }[] = [
  { title: "Ataque", row: "ataque" },
  { title: "Meio-campo", row: "meio" },
  { title: "Defesa", row: "defesa" },
  { title: "Goleiro", row: "goleiro" },
];

function MiniPitch({ participant, filledSlots, compact }: { participant: RoomParticipant; filledSlots: Record<string, Player>; compact?: boolean }) {
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
      <div className={compact ? "space-y-1.5" : "tactics-field space-y-2 rounded-md p-2"}>
        {ROW_GROUPS.map((row) => {
          const rowSlots = panel.filter((s) => s.row === row.row);
          if (rowSlots.length === 0) return null;
          return (
            <div key={row.title} className="flex flex-wrap justify-center gap-1">
              {rowSlots.map((slot) => (
                <div
                  key={slot.id}
                  className="flex min-w-[70px] flex-col items-center gap-0.5 rounded border border-border-subtle bg-surface-elevated px-1.5 py-1 text-center"
                >
                  <span className="font-mono text-[9px] text-text-tertiary">{slot.label}</span>
                  {slot.player ? (
                    <>
                      <span className="max-w-[64px] truncate font-sans text-[10px] font-medium leading-tight text-text-primary">
                        {slot.player.name}
                      </span>
                      <span className="font-mono text-[10px] text-gold">
                        {toDraftPlayerCard(slot.player, participant.tactics).overallFinal}
                      </span>
                    </>
                  ) : (
                    <span className="font-sans text-[10px] text-text-tertiary">—</span>
                  )}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function TeamPage() {
  const router = useRouter();
  const room = useSessionStore((s) => s.room);
  const selfParticipantId = useSessionStore((s) => s.selfParticipantId);
  const draftState = useSessionStore((s) => s.draftState);
  const [showOthers, setShowOthers] = useState(false);
  const [generating, setGenerating] = useState(false);

  const self = room?.participants.find((p) => p.id === selfParticipantId);
  const hostId = room?.participants[0]?.id;
  const isHost = !!self && self.id === hostId;
  const isSolo = !!room && room.participants.length <= 1;

  // Simula os outros participantes vendo o resumo e aguardando o administrador —
  // se o usuário não é o host, a liga "começa" pouco depois de o host iniciar.
  useEffect(() => {
    if (!room || isSolo || isHost) return;
    const timeout = setTimeout(() => {
      setGenerating(true);
      router.push(ROUTES.generatingLeague(room.id));
    }, 3200);
    return () => clearTimeout(timeout);
  }, [room, isSolo, isHost, router]);

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

      {/* Campo — jogadores agrupados por linha, sem imagens */}
      <div className="tactics-field mb-6 space-y-3 rounded-card border border-border-subtle bg-surface p-4">
        {ROW_GROUPS.map((row) => {
          const rowSlots = panel.filter((s) => s.row === row.row);
          if (rowSlots.length === 0) return null;
          return (
            <div key={row.title} className="flex flex-wrap justify-center gap-2">
              {rowSlots.map((slot) => (
                <div
                  key={slot.id}
                  className="flex min-w-[86px] flex-col items-center gap-0.5 rounded-md border border-border-subtle bg-surface-elevated px-2 py-2 text-center"
                >
                  <span className="font-mono text-[10px] text-text-tertiary">{slot.label}</span>
                  {slot.player ? (
                    <>
                      <span className="font-sans text-[11px] font-medium leading-tight text-text-primary">{slot.player.name}</span>
                      <span className="font-mono text-xs text-gold">
                        {toDraftPlayerCard(slot.player, self.tactics).overallFinal}
                      </span>
                    </>
                  ) : (
                    <span className="font-sans text-[11px] text-text-tertiary">vazio</span>
                  )}
                </div>
              ))}
            </div>
          );
        })}
      </div>

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
        <Button fullWidth size="lg" isLoading={generating} onClick={() => router.push(ROUTES.generatingLeague(room.id))}>
          Gerar Liga
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
            <MiniPitch key={participant.id} participant={participant} filledSlots={draftState.filledSlots[participant.id] ?? {}} compact />
          ))}
        </div>
      </Modal>
    </Screen>
  );
}
