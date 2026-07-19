"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
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
import { getCandidateCards, confirmPick, resolveTimeout, getSquadForParticipant, isCandidateEligible } from "@/services/draftService";
import { fetchDraftState, submitDraftState } from "@/services/draftSyncService";
import { fetchRoom } from "@/services/roomService";
import { ensureAnonymousSession } from "@/lib/supabase/auth";
import { useDraftRealtime } from "@/hooks/useDraftRealtime";
import { computeTeamOverall, computeTeamCompatibilityStars } from "@/services/compatibilityService";
import { cn } from "@/lib/utils";

export default function DraftPage() {
  const router = useRouter();
  const params = useParams<{ roomId: string }>();
  const room = useSessionStore((s) => s.room);
  const setRoom = useSessionStore((s) => s.setRoom);
  const selfParticipantId = useSessionStore((s) => s.selfParticipantId);
  const setSelfParticipantId = useSessionStore((s) => s.setSelfParticipantId);
  const draftState = useSessionStore((s) => s.draftState);
  const setDraftState = useSessionStore((s) => s.setDraftState);
  const draftVersion = useSessionStore((s) => s.draftVersion);
  const draftDeadline = useSessionStore((s) => s.draftDeadline);
  const setDraftSync = useSessionStore((s) => s.setDraftSync);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [lastPickFeed, setLastPickFeed] = useState<{ clubName: string; players: string[] } | null>(null);
  const [reconnecting, setReconnecting] = useState(true);
  const feedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reconexão: se a store estiver vazia (F5 no meio do Draft, aba nova, etc.),
  // busca a sala e o estado do Draft direto do Supabase. A partir daqui, o
  // useDraftRealtime abaixo mantém tudo sincronizado automaticamente.
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
        const snapshot = await fetchDraftState(currentRoom.id);
        if (cancelled) return;
        if (snapshot) {
          setDraftState(snapshot.state);
          setDraftSync(snapshot.version, snapshot.deadline);
        }
      } catch (e) {
        toast.urgent(e instanceof Error ? e.message : "Não foi possível conectar ao Draft.");
      } finally {
        if (!cancelled) setReconnecting(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.roomId]);

  // Sincronização em tempo real: qualquer pick confirmado ou turno resolvido
  // (por mim ou por qualquer outro participante) chega automaticamente.
  useDraftRealtime(room?.id ?? null);

  const currentTurn = draftState ? draftState.turns[draftState.currentTurnIndex] ?? null : null;
  const isSelfTurn = !!currentTurn && currentTurn.participantId === selfParticipantId;
  const turnParticipant = room?.participants.find((p) => p.id === currentTurn?.participantId) ?? null;
  const selfParticipant = room?.participants.find((p) => p.id === selfParticipantId) ?? null;
  const hideOverall = room?.draftMode === "hidden";
  const isSolo = !!room && room.maxPlayers === 1;
  // O Timer roda (montado) pra TODOS os clientes, sempre — é isso que mantém
  // o auto-pick robusto (qualquer cliente pode disparar o troca-de-turno se
  // precisar, sem depender de um único cliente "autorizado" continuar
  // conectado). A única diferença é puramente visual: o número/círculo só
  // aparece pro host — os demais continuam vendo normalmente as mensagens
  // "Sua vez!"/"{nome} está escolhendo...", só sem nenhum indicador numérico.
  const isHost = !!room && room.hostId === selfParticipantId;
  const showTimerNumber = isSolo || isHost;

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

  // Tempo restante calculado a partir do deadline do servidor (não de um
  // contador local) — recalculado só quando o turno ou o deadline mudam, pra
  // não reiniciar o Timer a cada re-render. Isso garante que todo mundo (e
  // quem acabou de reconectar) veja a contagem certa, sem depender do relógio
  // de cada navegador.
  const timerSeconds = useMemo(() => {
    if (!draftDeadline) return DRAFT_CONFIG.PICK_TIMER_SECONDS;
    return Math.max(0, Math.round((new Date(draftDeadline).getTime() - Date.now()) / 1000));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTurn?.index, draftDeadline]);

  useEffect(() => {
    if (isSelfTurn) toast.success("Sua vez de escolher!");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSelfTurn, currentTurn?.index]);

  useEffect(() => {
    if (draftState?.isComplete && room) {
      router.push(ROUTES.team(room.id));
    }
  }, [draftState?.isComplete, room, router]);

  if (reconnecting) {
    return (
      <main className="flex h-dvh w-full flex-col items-center justify-center bg-base px-5">
        <div className="size-6 animate-spin rounded-full border-2 border-border-strong border-t-gold" />
      </main>
    );
  }

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

  async function handleConfirm() {
    if (!isSelfTurn || selectedIds.length !== requiredPicks || !room || submitting) return;
    const { state: next, error } = confirmPick(draftState!, selectedIds);
    if (error) {
      toast.urgent(error);
      return;
    }
    setSubmitting(true);
    try {
      const accepted = await submitDraftState(room.id, draftVersion, next);
      if (!accepted) {
        // Alguém mais rápido já escreveu primeiro (ex: o timer zerou em outro
        // cliente no mesmo instante) — não é um erro, só aceitamos o que o
        // Realtime já está trazendo.
        toast.info("O turno já avançou — sincronizando...");
      }
    } catch (e) {
      toast.urgent(e instanceof Error ? e.message : "Não foi possível confirmar. Tente de novo.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleTimeout() {
    if (!draftState || !currentTurn || !room) return;
    const { state: next } = resolveTimeout(draftState, isSelfTurn ? selectedIds : []);
    try {
      const accepted = await submitDraftState(room.id, draftVersion, next);
      if (accepted && isSelfTurn) {
        toast.info(selectedIds.length > 0 ? "Picks confirmadas com o tempo esgotado." : "Tempo esgotado — escolha automática.");
      }
      // Se não foi aceito, outro cliente (o próprio dono do turno, ou
      // qualquer outro participante observando) já resolveu primeiro.
    } catch {
      // Falha pontual de rede — o Realtime volta a sincronizar sozinho.
    }
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
                    {isSelfTurn ? "Sua vez!" : `${turnParticipant?.name ?? "—"} está escolhendo...`}
                  </span>
                </p>
                <div className={cn(!showTimerNumber && "sr-only")} aria-hidden={!showTimerNumber}>
                  <Timer seconds={timerSeconds} resetKey={currentTurn.index} onComplete={handleTimeout} size={52} />
                </div>
                {!showTimerNumber && <div className="size-[52px] shrink-0" />}
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
              isLoading={submitting}
              disabled={!isSelfTurn || selectedIds.length !== requiredPicks || submitting}
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
