"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion } from "framer-motion";
import { Trophy, Medal, ChevronRight, RotateCcw } from "lucide-react";
import { Screen } from "@/components/layout/Screen";
import { Button } from "@/components/ui/Button";
import { ROUTES } from "@/constants/routes";
import { useSessionStore } from "@/store/sessionStore";
import { computeStandings, computeTopScorers, computeBestDefenses } from "@/services/leagueService";
import { resetCompetition } from "@/services/competitionSyncService";
import { fetchRoom } from "@/services/roomService";
import { ensureAnonymousSession } from "@/lib/supabase/auth";
import { useRoomRealtime } from "@/hooks/useRoomRealtime";
import { toast } from "@/store/toastStore";
import { cn } from "@/lib/utils";

export default function LeagueFinalPage() {
  const router = useRouter();
  const params = useParams<{ roomId: string }>();
  const room = useSessionStore((s) => s.room);
  const setRoom = useSessionStore((s) => s.setRoom);
  const teams = useSessionStore((s) => s.teams);
  const matches = useSessionStore((s) => s.matches);
  const selfParticipantId = useSessionStore((s) => s.selfParticipantId);
  const setSelfParticipantId = useSessionStore((s) => s.setSelfParticipantId);
  const userTeam = useSessionStore((s) => s.userTeam());
  const reset = useSessionStore((s) => s.reset);
  const [resetting, setResetting] = useState(false);
  const [reconnecting, setReconnecting] = useState(true);

  const isHost = !!room && room.hostId === selfParticipantId;
  const isSolo = !!room && room.maxPlayers === 1;

  // Reconexão: sem isso, um F5 nesta tela deixava `selfParticipantId` vazio,
  // e o próprio host deixava de ver o botão "Nova Liga" (isHost calculava
  // errado). Também escuta o status da sala em tempo real: se o host clicar
  // em "Nova Liga" enquanto outro jogador ainda está aqui, esse jogador é
  // levado pro Lobby automaticamente junto.
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

  useRoomRealtime(room?.id ?? null);

  useEffect(() => {
    if (room?.status === "lobby") router.push(ROUTES.lobby(room.id));
  }, [room, router]);

  if (reconnecting) {
    return (
      <Screen center>
        <div className="size-6 animate-spin rounded-full border-2 border-border-strong border-t-gold" />
      </Screen>
    );
  }

  if (!room || !userTeam) {
    return (
      <Screen center>
        <p className="font-sans text-sm text-text-secondary">Nenhuma liga concluída ainda.</p>
      </Screen>
    );
  }

  async function handleNewLeague() {
    if (!room) return;
    setResetting(true);
    try {
      await resetCompetition(room.id);
      router.push(ROUTES.lobby(room.id));
    } catch (e) {
      toast.urgent(e instanceof Error ? e.message : "Não foi possível reiniciar a competição.");
      setResetting(false);
    }
  }

  const standings = computeStandings(teams, matches, userTeam.id);
  const champion = standings[0];
  const isChampion = champion?.isUserTeam;
  const userPosition = standings.findIndex((s) => s.teamId === userTeam.id) + 1;
  const topScorers = computeTopScorers(matches, 1);
  const bestDefenses = computeBestDefenses(standings, 1);
  const relegated = standings.slice(-4);
  const isRelegated = userPosition > standings.length - 4;

  const campaignColor = isChampion ? "text-gold" : userPosition <= 4 ? "text-success" : isRelegated ? "text-danger" : "text-text-primary";
  const campaignLabel = isChampion ? "Campeão da temporada!" : userPosition <= 4 ? "Classificação continental" : isRelegated ? "Rebaixado" : "Temporada encerrada";

  function playAgain() {
    reset();
    router.push(ROUTES.menu);
  }

  return (
    <Screen center>
      <div className="w-full text-center">
        <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", duration: 0.6 }}>
          <Trophy className="mx-auto mb-3 text-gold" size={44} />
        </motion.div>
        <h1 className="font-display text-3xl tracking-wide text-text-primary">FIM DE LIGA</h1>
        <p className="mt-1 font-sans text-sm text-text-tertiary">Temporada encerrada</p>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mt-6 rounded-card border border-gold/40 bg-gradient-to-b from-gold/15 via-surface to-surface p-5 shadow-glow-gold"
        >
          <p className="font-sans text-[10px] uppercase tracking-wide text-text-tertiary">Campeão</p>
          <p className="font-display text-3xl text-gold">{champion?.teamName ?? "—"}</p>
          <p className="font-mono text-xs text-text-tertiary">{champion?.points ?? 0} pontos</p>
        </motion.div>

        <div className="mt-4 rounded-card border border-border-subtle bg-surface p-4">
          <p className="font-sans text-[10px] uppercase tracking-wide text-text-tertiary">Sua campanha</p>
          <p className={cn("font-display text-2xl", campaignColor)}>{userPosition}º lugar</p>
          <p className="font-mono text-xs text-text-tertiary">{userTeam.clubName}</p>
          <p className={cn("mt-1 font-sans text-[11px] font-semibold", campaignColor)}>{campaignLabel}</p>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-card border border-border-subtle bg-surface p-3 text-center">
            <p className="mb-1 flex items-center justify-center gap-1 font-sans text-[10px] text-text-tertiary">
              <Medal size={11} className="text-teal-bright" /> Artilheiro
            </p>
            <p className="truncate font-sans text-sm font-semibold text-text-primary">{topScorers[0]?.playerName ?? "—"}</p>
            <p className="font-mono text-xs text-teal-bright">{topScorers[0]?.goals ?? 0} gols</p>
          </div>
          <div className="rounded-card border border-border-subtle bg-surface p-3 text-center">
            <p className="mb-1 flex items-center justify-center gap-1 font-sans text-[10px] text-text-tertiary">
              <Medal size={11} className="text-teal-bright" /> Melhor defesa
            </p>
            <p className="truncate font-sans text-sm font-semibold text-text-primary">{bestDefenses[0]?.teamName ?? "—"}</p>
            <p className="font-mono text-xs text-teal-bright">{bestDefenses[0]?.goalsConceded ?? 0} sofridos</p>
          </div>
        </div>

        <div className="mt-4 rounded-card border border-danger/30 bg-danger/5 p-4">
          <p className="mb-2 font-sans text-[10px] uppercase tracking-wide text-text-tertiary">Rebaixados</p>
          <div className="space-y-1.5">
            {relegated.map((row, i) => (
              <p key={row.teamId} className="flex items-center justify-between font-sans text-sm">
                <span className="text-text-secondary">
                  ⬇️ {standings.length - relegated.length + i + 1}º {row.teamName}
                </span>
                {row.isUserTeam && <span className="font-mono text-[10px] text-danger">Você</span>}
              </p>
            ))}
          </div>
        </div>

        <button
          onClick={() => router.push(ROUTES.standings(room.id))}
          className="mt-4 flex w-full items-center justify-center gap-1 font-sans text-xs text-text-tertiary transition-colors hover:text-text-primary"
        >
          Ver classificação completa <ChevronRight size={13} />
        </button>

        <div className="mt-6 space-y-2">
          {!isSolo && isHost && (
            <Button fullWidth size="lg" variant="secondary" icon={<RotateCcw size={16} />} isLoading={resetting} onClick={handleNewLeague}>
              Nova Liga (mesma sala)
            </Button>
          )}
          <Button fullWidth size="lg" onClick={playAgain}>
            Jogar novamente
          </Button>
          <Button
            fullWidth
            variant="secondary"
            onClick={() => {
              reset();
              router.push(ROUTES.menu);
            }}
          >
            Voltar ao menu
          </Button>
        </div>
      </div>
    </Screen>
  );
}
