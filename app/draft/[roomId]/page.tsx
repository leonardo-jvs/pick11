"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Timer } from "@/components/ui/Timer";
import { DraftPlayerCard } from "@/components/features/draft/DraftPlayerCard";
import { AnimatePresence, motion } from "framer-motion";
import { FormationPitch } from "@/components/features/league/FormationPitch";
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
import { computeTeamOverall, computeTeamCompatibilityStars } from "@/services/compatibilityService";
import { cn } from "@/lib/utils";

export default function DraftPage() {
  const router = useRouter();
  const room = useSessionStore((s) => s.room);
  const selfParticipantId = useSessionStore((s) => s.selfParticipantId);
  const draftState = useSessionStore((s) => s.draftState);
  const setDraftState = useSessionStore((s) => s.setDraftState);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [lastPickFeed, setLastPickFeed] = useState<{ clubName: string; players: string[] } | null>(null);
  const resolvedTurnRef = useRef<number>(-1);
  const feedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentTurn = draftState ? draftState.turns[draftState.currentTurnIndex] ?? null : null;
  const isSelfTurn = !!currentTurn && currentTurn.participantId === selfParticipantId;
  const turnParticipant = room?.participants.find((p) => p.id === currentTurn?.participantId) ?? null;
  const selfParticipant = room?.participants.find((p) => p.id === selfParticipantId) ?? null;
  const hideOverall = room?.draftMode === "hidden";

  useEffect(() => {
    setSelectedIds([]);
  }, [draftState?.currentTurnIndex]);

  // Feed de últimas escolhas: sempre que um turno termina (o próprio usuário ou
  // qualquer outro treinador), mostra o time + os jogadores escolhidos por ~4.5s
  useEffect(() => {
    if (!draftState || !room || draftState.currentTurnIndex === 0) return;
    const completedTurnIndex = draftState.currentTurnIndex - 1;
    const picks = draftState.picks.filter((p) => p.turnIndex === completedTurnIndex);
    if (picks.length === 0) return;

    const participant = room.participants.find((p) => p.id === picks[0].participantId);
    if (!participant) return;

    setLastPickFeed({ clubName: participant.clubName, players: picks.map((p) => p.player.name) });

    if (feedTimeoutRef.current) clearTimeout(feedTimeoutRef.current);
    feedTimeoutRef.current = setTimeout(() => setLastPickFeed(null), 4500);

    return () => {
      if (feedTimeoutRef.current) clearTimeout(feedTimeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
  const selfStarters = Object.values(selfFilledSlots);
  const selfOverallPartial = selfParticipant ? computeTeamOverall(selfStarters, selfParticipant.tactics) : 0;
  const selfCompatStars = selfParticipant && selfStarters.length > 0 ? computeTeamCompatibilityStars(selfStarters, selfParticipant.tactics) : null;
  const selfPickedCount = getSquadForParticipant(draftState, selfParticipantId ?? "").length;

  return (
    <main className="flex h-dvh w-full flex-col overflow-hidden bg-base">
      <div className="mx-auto flex h-full w-full max-w-[1680px] flex-col overflow-hidden px-[clamp(10px,1.6vw,24px)] py-[clamp(6px,1vh,10px)]">
        {/* Faixa superior compartilhada: logo + modo da sala */}
        <div className="mb-[clamp(4px,0.7vh,8px)] flex shrink-0 items-center justify-between">
          <p className="font-display text-sm tracking-widest text-gold">PICK11</p>
          <div className="flex items-center gap-1.5 rounded-pill border border-border-subtle bg-surface px-2.5 py-1 font-sans text-[10px] text-text-tertiary">
            {hideOverall ? <EyeOff size={11} className="text-warning" /> : <Eye size={11} className="text-teal-bright" />}
            Modo: <span className={cn("font-semibold", hideOverall ? "text-warning" : "text-teal-bright")}>{hideOverall ? "Over Oculto" : "Over Visível"}</span>
          </div>
        </div>

        {/* Uma coluna no celular (campinho em cima, Draft embaixo) — duas colunas lado a lado a partir de md: */}
        <div className="flex min-h-0 flex-1 flex-col gap-[clamp(4px,0.7vh,12px)] md:flex-row">
          {/* ESQUERDA — fixo, toda a informação do usuário */}
          {selfParticipant && (
            <aside className="flex max-h-[24vh] shrink-0 flex-col gap-[clamp(3px,0.6vh,8px)] overflow-hidden md:max-h-none md:w-[30%] md:min-w-[220px] lg:min-w-[260px]">
              <FormationPitch
                formation={selfParticipant.tactics.formation}
                filledSlots={selfFilledSlots}
                tactics={selfParticipant.tactics}
                responsive
                className="min-h-0 flex-1"
              />
              <div className="hidden shrink-0 grid-cols-2 gap-1.5 md:grid">
                <div className="rounded-card border border-border-subtle bg-surface p-2 text-center">
                  <p className="font-sans text-[9px] text-text-tertiary">Formação</p>
                  <p className="font-mono text-sm font-bold text-text-primary">{selfParticipant.tactics.formation}</p>
                </div>
                <div className="rounded-card border border-border-subtle bg-surface p-2 text-center">
                  <p className="font-sans text-[9px] text-text-tertiary">Overall parcial</p>
                  <p className="font-mono text-sm font-bold text-gold">{selfStarters.length > 0 ? selfOverallPartial : "—"}</p>
                </div>
                <div className="rounded-card border border-border-subtle bg-surface p-2 text-center">
                  <p className="font-sans text-[9px] text-text-tertiary">Escolhidos</p>
                  <p className="font-mono text-sm font-bold text-teal-bright">{selfPickedCount}/{DRAFT_CONFIG.STARTERS_DRAFTED}</p>
                </div>
                <div className="rounded-card border border-border-subtle bg-surface p-2 text-center">
                  <p className="font-sans text-[9px] text-text-tertiary">Compatibilidade</p>
                  <p className="font-mono text-sm font-bold text-text-primary">{selfCompatStars ? "★".repeat(selfCompatStars) : "—"}</p>
                </div>
              </div>
              <div className="hidden shrink-0 rounded-card border border-border-subtle bg-surface p-2 text-center font-sans text-[10px] text-text-tertiary md:block">
                <span className="text-text-secondary">Ataque</span> {selfParticipant.tactics.attackStyle}
                <span className="mx-1.5 text-border-strong">·</span>
                <span className="text-text-secondary">Defesa</span> {selfParticipant.tactics.defenseStyle}
              </div>
            </aside>
          )}

          {/* DIREITA — Draft: timer, ordem, cartas, confirmar */}
          <section className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div
              className={cn(
                "shrink-0 rounded-lg border px-[clamp(8px,1vw,12px)] py-[clamp(5px,0.8vh,8px)] transition-colors duration-300",
                isSelfTurn ? "border-gold shadow-glow-gold" : "border-border-subtle"
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="truncate font-sans text-[11px] text-text-tertiary">
                  Rodada {Math.floor(currentTurn.index / draftState.order.length) + 1}
                  {" · "}
                  <span className={isSelfTurn ? "font-semibold text-gold" : "text-text-secondary"}>
                    {isSelfTurn ? "Sua vez!" : `Vez de ${turnParticipant?.name ?? "—"}`}
                  </span>
                </p>
                <Timer
                  seconds={DRAFT_CONFIG.PICK_TIMER_SECONDS}
                  resetKey={currentTurn.index}
                  onComplete={isSelfTurn ? handleTimeout : undefined}
                  size={52}
                />
              </div>

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

            <div className={cn("mt-[clamp(4px,0.7vh,8px)] mb-[clamp(2px,0.35vh,4px)] min-h-0 flex-1 transition-all duration-300", !isSelfTurn && "opacity-60 grayscale")}>
              <div className="grid h-full grid-cols-3 grid-rows-2 gap-[clamp(3px,0.7vmin,7px)]">
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
                          hideOverall={hideOverall}
                          onToggle={() => toggleCandidate(card.id)}
                        />
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </div>

            <Button
              fullWidth
              size="lg"
              className="shrink-0"
              disabled={!isSelfTurn || selectedIds.length !== requiredPicks}
              onClick={handleConfirm}
            >
              {isSelfTurn ? `Confirmar pick (${selectedIds.length}/${requiredPicks})` : "Aguarde sua vez"}
            </Button>
          </section>
        </div>

        {/* Feed das últimas escolhas — histórico em tempo real, some sozinho após alguns segundos (escondido no celular pra sobrar espaço pras cartas) */}
        <div className="mt-2 hidden h-[52px] shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border-subtle bg-surface/95 px-4 md:flex">
          <AnimatePresence mode="wait">
            {lastPickFeed ? (
              <motion.div
                key={`${lastPickFeed.clubName}-${lastPickFeed.players.join()}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="text-center"
              >
                <p className="font-sans text-[11px] font-semibold uppercase tracking-wide text-gold">{lastPickFeed.clubName}</p>
                <p className="font-sans text-sm text-text-primary">{lastPickFeed.players.join(" • ")}</p>
              </motion.div>
            ) : (
              <motion.p
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="font-sans text-[11px] text-text-tertiary"
              >
                Aguardando novas escolhas...
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>
    </main>
  );
}
