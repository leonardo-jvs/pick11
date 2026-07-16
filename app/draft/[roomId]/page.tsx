"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Timer } from "@/components/ui/Timer";
import { DraftPlayerCard } from "@/components/features/draft/DraftPlayerCard";
import { DraftFormationBar } from "@/components/features/draft/DraftFormationBar";
import { ROUTES } from "@/constants/routes";
import { DRAFT_CONFIG } from "@/constants/game";
import { useSessionStore } from "@/store/sessionStore";
import { toast } from "@/store/toastStore";
import {
  getCandidateCards,
  confirmPick,
  resolveTimeout,
  getSquadForParticipant,
  isCandidateEligible,
} from "@/services/draftService";
import { computeTeamOverall } from "@/services/compatibilityService";
import { cn } from "@/lib/utils";

export default function DraftPage() {
  const router = useRouter();
  const room = useSessionStore((s) => s.room);
  const selfParticipantId = useSessionStore((s) => s.selfParticipantId);
  const draftState = useSessionStore((s) => s.draftState);
  const setDraftState = useSessionStore((s) => s.setDraftState);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const resolvedTurnRef = useRef<number>(-1);

  const currentTurn = draftState ? draftState.turns[draftState.currentTurnIndex] ?? null : null;
  const isSelfTurn = !!currentTurn && currentTurn.participantId === selfParticipantId;
  const turnParticipant = room?.participants.find((p) => p.id === currentTurn?.participantId) ?? null;
  const selfParticipant = room?.participants.find((p) => p.id === selfParticipantId) ?? null;

  useEffect(() => {
    setSelectedIds([]);
  }, [draftState?.currentTurnIndex]);

  const candidateCards = useMemo(() => {
    if (!draftState) return [];
    return getCandidateCards(draftState);
  }, [draftState]);

  // Simula automaticamente a vez de outros participantes humanos (não há backend real)
  useEffect(() => {
    if (!draftState || !currentTurn || !turnParticipant) return;
    if (isSelfTurn || draftState.isComplete) return;
    if (resolvedTurnRef.current === currentTurn.index) return;
    resolvedTurnRef.current = currentTurn.index;

    const timeout = setTimeout(() => {
      const { state: next } = resolveTimeout(draftState, []);
      setDraftState(next);
    }, DRAFT_CONFIG.BOT_PICK_ANIMATION_MS);

    return () => clearTimeout(timeout);
  }, [draftState, currentTurn, turnParticipant, isSelfTurn, setDraftState]);

  useEffect(() => {
    if (isSelfTurn) toast.success("Sua vez de escolher!");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSelfTurn, currentTurn?.index]);

  useEffect(() => {
    if (draftState?.isComplete && room) {
      router.push(ROUTES.team(room.id));
    }
  }, [draftState?.isComplete, room, router]);

  if (!room || !draftState || !currentTurn) {
    return (
      <main className="flex h-dvh w-full flex-col items-center justify-center bg-base px-5">
        <p className="mb-4 font-sans text-sm text-text-secondary">Nenhum draft em andamento.</p>
        <button onClick={() => router.push(ROUTES.roomHub)} className="font-sans text-sm text-gold">
          Voltar ao multiplayer
        </button>
      </main>
    );
  }

  const requiredPicks = currentTurn.requiredPicks;

  function isEligible(playerId: string) {
    if (!draftState || !turnParticipant) return false;
    const player = draftState.candidates.find((c) => c.id === playerId);
    if (!player) return false;
    return isCandidateEligible(draftState, turnParticipant.id, player);
  }

  function toggleCandidate(playerId: string) {
    if (!isSelfTurn || !isEligible(playerId)) return;
    setSelectedIds((prev) => {
      if (prev.includes(playerId)) return prev.filter((id) => id !== playerId);
      if (prev.length >= requiredPicks) {
        return requiredPicks === 1 ? [playerId] : prev;
      }
      return [...prev, playerId];
    });
  }

  function handleConfirm() {
    if (!isSelfTurn || selectedIds.length !== requiredPicks) return;
    const { state: next, error } = confirmPick(draftState!, selectedIds);
    if (error) {
      toast.urgent(error);
      return;
    }
    setDraftState(next);
  }

  function handleTimeout() {
    if (!isSelfTurn) return;
    const { state: next } = resolveTimeout(draftState!, selectedIds);
    setDraftState(next);
    toast.info(selectedIds.length > 0 ? "Picks confirmadas com o tempo esgotado." : "Tempo esgotado — escolha automática.");
  }

  const selfFilledSlots = selfParticipant ? draftState.filledSlots[selfParticipant.id] ?? {} : {};
  const selfOverallPartial = selfParticipant
    ? computeTeamOverall(Object.values(selfFilledSlots), selfParticipant.tactics)
    : 0;

  return (
    <main className="flex h-dvh w-full flex-col overflow-hidden bg-base">
      <div className="mx-auto flex h-full w-full max-w-[420px] flex-col overflow-hidden px-3 py-2 sm:max-w-[720px] lg:max-w-[860px] lg:px-4 lg:py-3">
        {/* Cabeçalho compacto: logo, rodada, ordem, vez, timer */}
        <div
          className={cn(
            "shrink-0 rounded-lg border px-3 py-2 transition-colors duration-300",
            isSelfTurn ? "border-gold shadow-glow-gold" : "border-border-subtle"
          )}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="font-display text-sm tracking-widest text-gold">PICK11</p>
              <p className="truncate font-sans text-[11px] text-text-tertiary">
                Rodada {Math.floor(currentTurn.index / draftState.order.length) + 1}
                {" · "}
                <span className={isSelfTurn ? "font-semibold text-gold" : "text-text-secondary"}>
                  {isSelfTurn ? "Sua vez!" : `Vez de ${turnParticipant?.name ?? "—"}`}
                </span>
              </p>
            </div>
            <Timer
              seconds={DRAFT_CONFIG.PICK_TIMER_SECONDS}
              resetKey={currentTurn.index}
              onComplete={isSelfTurn ? handleTimeout : undefined}
              size={52}
            />
          </div>

          {/* Ordem do draft — linha única, compacta */}
          <div className="mt-1.5 flex gap-1.5 overflow-x-auto">
            {draftState.order.map((pid) => {
              const participant = room.participants.find((p) => p.id === pid);
              const picked = draftState.picks.filter((p) => p.participantId === pid).length;
              const isTurn = pid === currentTurn.participantId;
              return (
                <div
                  key={pid}
                  className={cn(
                    "flex shrink-0 items-center gap-1 rounded-pill border px-2 py-0.5 font-sans text-[10px]",
                    isTurn ? "border-gold bg-gold/10 text-gold" : "border-border-subtle text-text-tertiary"
                  )}
                >
                  {picked >= DRAFT_CONFIG.STARTERS_DRAFTED && <Check size={9} />}
                  {participant?.id === selfParticipantId ? "Você" : participant?.name ?? "—"}
                  <span className="font-mono text-[9px] opacity-70">{picked}/11</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Cartas — área principal, sempre 6 em 2 linhas de 3, nunca rola */}
        <div className={cn("my-2 min-h-0 flex-1 transition-all duration-300", !isSelfTurn && "opacity-60 grayscale")}>
          <div className="grid h-full grid-cols-3 grid-rows-2 gap-2">
            <AnimatePresence mode="popLayout">
              {candidateCards.map((card) => {
                const eligible = isEligible(card.id);
                return (
                  <motion.div
                    key={card.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9, y: 8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.85 }}
                    transition={{ duration: 0.22, ease: "easeOut" }}
                    className="min-h-0"
                  >
                    <DraftPlayerCard
                      card={card}
                      selected={selectedIds.includes(card.id)}
                      disabled={!isSelfTurn || !eligible}
                      disabledReason={isSelfTurn && !eligible ? "Posição ocupada" : undefined}
                      formation={turnParticipant?.tactics.formation}
                      filledSlotIds={turnParticipant ? new Set(Object.keys(draftState.filledSlots[turnParticipant.id] ?? {})) : undefined}
                      onToggle={() => toggleCandidate(card.id)}
                    />
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>

        {/* Confirmar pick — sempre visível */}
        <Button
          fullWidth
          size="lg"
          className="shrink-0"
          disabled={!isSelfTurn || selectedIds.length !== requiredPicks}
          onClick={handleConfirm}
        >
          {isSelfTurn
            ? `Confirmar pick (${selectedIds.length}/${requiredPicks})`
            : "Aguarde sua vez"}
        </Button>

        {/* Escalação — barra fixa, sempre visível, nunca some */}
        {selfParticipant && (
          <div className="mt-2 shrink-0">
            <DraftFormationBar tactics={selfParticipant.tactics} filledSlots={selfFilledSlots} overallPartial={selfOverallPartial} />
          </div>
        )}
      </div>
    </main>
  );
}
