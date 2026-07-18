"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Screen } from "@/components/layout/Screen";
import { Modal } from "@/components/ui/Modal";
import { StandingsTable } from "@/components/features/league/StandingsTable";
import { ROUTES } from "@/constants/routes";
import { LEAGUE_CONFIG, LIVE_MATCH_CONFIG, BOOST_LABELS } from "@/constants/game";
import { useSessionStore } from "@/store/sessionStore";
import { computeStandings } from "@/services/leagueService";
import { computeGroupStandings } from "@/services/cupService";
import { fetchCompetitionState } from "@/services/competitionSyncService";
import { fetchRoom } from "@/services/roomService";
import { ensureAnonymousSession } from "@/lib/supabase/auth";
import { useCompetitionRealtime } from "@/hooks/useCompetitionRealtime";
import { toast } from "@/store/toastStore";
import { Boost } from "@/types/team";
import { Match } from "@/types/match";
import { cn } from "@/lib/utils";

interface Beat {
  minute: string;
  text: string;
  isGoal?: boolean;
}

const FILLERS = [
  "O jogo começa equilibrado.",
  "Grande defesa do goleiro!",
  "O adversário aumenta a pressão.",
  "Muita disputa no meio-campo.",
  "Boa troca de passes.",
  "A torcida pede mais intensidade.",
];

function buildBeats(match: Match, penalties?: { home: number; away: number }): Beat[] {
  const beats: Beat[] = [{ minute: "0'", text: "A bola está rolando!" }];
  const sortedEvents = [...match.events].sort((a, b) => a.minute - b.minute);
  let homeScore = 0;
  let awayScore = 0;
  let lastMinute = 0;
  let fillerIdx = 0;

  for (const evt of sortedEvents) {
    if (evt.minute - lastMinute > 18 && fillerIdx < FILLERS.length) {
      const fillerMinute = lastMinute + Math.floor((evt.minute - lastMinute) / 2);
      beats.push({ minute: `${fillerMinute}'`, text: FILLERS[fillerIdx++ % FILLERS.length] });
    }
    if (evt.type === "goal") {
      if (evt.team === "home") homeScore++;
      else awayScore++;
      const teamName = evt.team === "home" ? match.homeTeamName : match.awayTeamName;
      beats.push({
        minute: `${evt.minute}'`,
        text: `⚽ GOOOOOOL!\n${evt.playerName}\n${teamName}\n${homeScore} x ${awayScore}`,
        isGoal: true,
      });
    } else if (evt.type === "yellow_card") {
      beats.push({ minute: `${evt.minute}'`, text: `🟨 Cartão amarelo para ${evt.playerName}` });
    } else if (evt.type === "red_card") {
      beats.push({ minute: `${evt.minute}'`, text: `🟥 Cartão vermelho para ${evt.playerName}!` });
    }
    lastMinute = evt.minute;
  }

  if (penalties) {
    beats.push({
      minute: "PÊN",
      text: `🥅 Nos pênaltis!\n${match.homeTeamName} ${penalties.home} x ${penalties.away} ${match.awayTeamName}`,
      isGoal: true,
    });
  }

  beats.push({ minute: "90'", text: "Fim de jogo." });
  return beats;
}

export default function SimulationPage() {
  const router = useRouter();
  const params = useParams<{ roomId: string }>();
  const room = useSessionStore((s) => s.room);
  const setRoom = useSessionStore((s) => s.setRoom);
  const setSelfParticipantId = useSessionStore((s) => s.setSelfParticipantId);
  const teams = useSessionStore((s) => s.teams);
  const matches = useSessionStore((s) => s.matches);
  const cupState = useSessionStore((s) => s.cupState);
  const userTeam = useSessionStore((s) => s.userTeam());

  const isCup = room?.gameMode === "cup";

  const [visibleCount, setVisibleCount] = useState(0);
  const [phase, setPhase] = useState<"narration" | "stats">("narration");
  const [showStandings, setShowStandings] = useState(false);
  const [reconnecting, setReconnecting] = useState(true);
  const navigatedRef = useRef(false);

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

  // A minha partida é sempre a mais recente do histórico envolvendo meu time
  // — o resultado já foi calculado e gravado pelo servidor (Pré-Partida, ao
  // cronômetro compartilhado chegar a zero), aqui só lemos e narramos.
  const userMatch = useMemo(() => {
    if (!userTeam) return null;
    const mine = matches.filter((m) => m.homeTeamId === userTeam.id || m.awayTeamId === userTeam.id);
    return mine.length > 0 ? mine[mine.length - 1] : null;
  }, [matches, userTeam?.id]);

  const knockoutEntry = useMemo(() => {
    if (!cupState || !userMatch) return null;
    return cupState.knockout.find((k) => k.matchId === userMatch.id) ?? null;
  }, [cupState, userMatch]);

  const penaltyResult = knockoutEntry?.wentToPenalties && knockoutEntry.penaltyScore
    ? { home: knockoutEntry.penaltyScore[0], away: knockoutEntry.penaltyScore[1] }
    : null;

  const cupOutcome: "none" | "advance" | "champion" | "eliminated" = useMemo(() => {
    if (!isCup || !userTeam) return "none";
    if (!knockoutEntry) return "advance"; // ainda na fase de grupos, ou fixture de grupo
    if (knockoutEntry.winnerId !== userTeam.id) return "eliminated";
    return knockoutEntry.phase === "final" ? "champion" : "advance";
  }, [isCup, userTeam, knockoutEntry]);

  const beats = useMemo(() => (userMatch ? buildBeats(userMatch, penaltyResult ?? undefined) : []), [userMatch, penaltyResult]);

  // Narra os acontecimentos progressivamente durante ~5s
  useEffect(() => {
    if (beats.length === 0 || phase !== "narration") return;
    if (visibleCount >= beats.length) {
      const toStats = setTimeout(() => setPhase("stats"), 400);
      return () => clearTimeout(toStats);
    }
    const interval = Math.max(350, Math.floor((LIVE_MATCH_CONFIG.NARRATION_SECONDS * 1000) / beats.length));
    const t = setTimeout(() => setVisibleCount((c) => c + 1), interval);
    return () => clearTimeout(t);
  }, [beats, visibleCount, phase]);

  // Depois das estatísticas, navega sozinho pra próxima etapa.
  // Mesma correção aplicada no Lobby: `userMatch`/`matches` podem trocar de
  // referência por eventos do Realtime não relacionados enquanto essa tela
  // está aberta; se a pausa fosse um setTimeout do próprio efeito, o cleanup
  // cancelaria a navegação agendada sempre que isso acontecesse. Por isso a
  // decisão de navegar é travada (`navigatedRef.current = true`) ANTES de
  // agendar a pausa, e a pausa fica dentro de uma função assíncrona sem
  // cleanup que a cancele.
  useEffect(() => {
    if (phase !== "stats" || !room || !userMatch || navigatedRef.current) return;
    navigatedRef.current = true;

    (async () => {
      await new Promise((r) => setTimeout(r, LIVE_MATCH_CONFIG.STATS_SECONDS * 1000));
      setShowStandings(false);
      if (isCup) {
        if (cupOutcome === "champion" || cupOutcome === "eliminated") {
          router.push(ROUTES.cupFinal(room.id));
        } else {
          router.push(ROUTES.preMatch(room.id, 1));
        }
      } else if (userMatch.round >= LEAGUE_CONFIG.TOTAL_ROUNDS) {
        router.push(ROUTES.leagueFinal(room.id));
      } else {
        router.push(ROUTES.preMatch(room.id, userMatch.round + 1));
      }
    })();
  }, [phase, room, isCup, cupOutcome, userMatch, router]);

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
        <p className="font-sans text-sm text-text-secondary">Nenhuma liga em andamento.</p>
      </Screen>
    );
  }

  if (!userMatch) {
    return (
      <Screen center>
        <div className="flex flex-col items-center gap-3">
          <div className="size-6 animate-spin rounded-full border-2 border-border-strong border-t-gold" />
          <p className="font-sans text-sm text-text-secondary">Aguardando o resultado da rodada...</p>
        </div>
      </Screen>
    );
  }

  const isHome = userMatch.homeTeamId === userTeam.id;
  const userScore = isHome ? userMatch.homeScore : userMatch.awayScore;
  const opponentScore = isHome ? userMatch.awayScore : userMatch.homeScore;
  const opponentName = isHome ? userMatch.awayTeamName : userMatch.homeTeamName;
  const userGroup = isCup && cupState ? cupState.groups.find((g) => g.teamIds.includes(userTeam.id)) ?? null : null;
  const userBoost = (isHome ? userMatch.homeBoost : userMatch.awayBoost) as Boost | undefined;
  const opponentBoost = (isHome ? userMatch.awayBoost : userMatch.homeBoost) as Boost | undefined;

  return (
    <Screen center>
      <div className="w-full">
        {phase === "narration" ? (
          <div className="flex flex-col items-center">
            <p className="mb-1 font-sans text-xs text-text-tertiary">
              {userTeam.clubName} <span className="text-text-tertiary">x</span> {opponentName}
            </p>
            <div className="mb-4 flex size-2 items-center justify-center">
              <span className="size-2 animate-pulse rounded-full bg-danger" />
            </div>
            <div className="min-h-[220px] w-full space-y-3 overflow-hidden">
              {beats.slice(0, visibleCount).map((beat, i) => (
                <div
                  key={i}
                  className={cn(
                    "animate-fade-up rounded-card border px-3 py-2.5 text-center",
                    beat.isGoal ? "border-gold/50 bg-gold/10" : "border-border-subtle bg-surface"
                  )}
                >
                  <p className="font-mono text-[10px] text-text-tertiary">{beat.minute}</p>
                  {beat.text.split("\n").map((line, li) => (
                    <p
                      key={li}
                      className={cn(
                        "font-sans",
                        beat.isGoal && li === 0 ? "text-base font-bold text-gold" : "text-sm text-text-secondary",
                        beat.isGoal && li > 0 && "text-text-primary"
                      )}
                    >
                      {line}
                    </p>
                  ))}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div>
            {(() => {
              const outcome = userScore > opponentScore ? "Vitória" : userScore < opponentScore ? "Derrota" : "Empate";
              const outcomeColor = outcome === "Vitória" ? "text-success" : outcome === "Derrota" ? "text-danger" : "text-warning";
              return <p className={cn("mb-1 text-center font-display text-xl tracking-wide", outcomeColor)}>{outcome}</p>;
            })()}
            <p className="mb-4 text-center font-sans text-xs text-text-tertiary">
              {isCup ? "Copa · Fim de jogo" : `Rodada ${userMatch.round} · Fim de jogo`}
            </p>

            <div className="mb-5 flex items-center justify-center gap-4 rounded-card border border-border-subtle bg-surface p-6">
              <div className="flex-1 text-center">
                <p className="truncate font-sans text-sm text-text-secondary">{userMatch.homeTeamName}</p>
              </div>
              <p className="font-display text-5xl text-text-primary">
                {userMatch.homeScore} <span className="text-text-tertiary">-</span> {userMatch.awayScore}
              </p>
              <div className="flex-1 text-center">
                <p className="truncate font-sans text-sm text-text-secondary">{userMatch.awayTeamName}</p>
              </div>
            </div>

            {penaltyResult && (
              <p className="mb-4 text-center font-mono text-xs text-teal-bright">
                Decidido nos pênaltis: {penaltyResult.home} x {penaltyResult.away}
              </p>
            )}

            <div className="mb-4 grid grid-cols-3 gap-2 text-center font-mono text-[11px] text-text-tertiary">
              <div className="rounded-card border border-border-subtle bg-surface p-2">
                <p className="text-text-primary">{userMatch.stats.possession}%</p>
                <p>Posse</p>
              </div>
              <div className="rounded-card border border-border-subtle bg-surface p-2">
                <p className="text-text-primary">
                  {userMatch.stats.shots[0]}-{userMatch.stats.shots[1]}
                </p>
                <p>Finalizações</p>
              </div>
              <div className="rounded-card border border-border-subtle bg-surface p-2">
                <p className="truncate text-text-primary">{userMatch.manOfTheMatch}</p>
                <p>Destaque</p>
              </div>
            </div>

            <div className="mb-5 rounded-card border border-border-subtle bg-surface p-3">
              <p className="mb-1.5 font-sans text-[10px] uppercase tracking-wide text-text-tertiary">Bônus utilizado</p>
              <p className="font-sans text-sm text-text-secondary">
                <span className="font-semibold text-text-primary">{userMatch.homeTeamId === userTeam.id ? userTeam.clubName : opponentName}:</span>{" "}
                {BOOST_LABELS[(isHome ? userBoost : opponentBoost) ?? "Nenhum"]}
                <span className="mx-2 text-text-tertiary">×</span>
                <span className="font-semibold text-text-primary">{userMatch.awayTeamId === userTeam.id ? userTeam.clubName : opponentName}:</span>{" "}
                {BOOST_LABELS[(isHome ? opponentBoost : userBoost) ?? "Nenhum"]}
              </p>
            </div>

            {isCup && cupOutcome === "eliminated" && (
              <p className="mb-3 text-center font-sans text-sm font-semibold text-danger">Eliminado da Copa</p>
            )}
            {isCup && cupOutcome === "champion" && (
              <p className="mb-3 text-center font-sans text-sm font-semibold text-gold">🏆 Campeão da Copa!</p>
            )}

            {!isCup && (
              <button onClick={() => setShowStandings(true)} className="block w-full text-center font-sans text-sm text-gold">
                Ver classificação
              </button>
            )}
            {isCup && cupState?.phase === "groups" && cupOutcome === "advance" && (
              <button onClick={() => setShowStandings(true)} className="block w-full text-center font-sans text-sm text-gold">
                Ver Classificação dos Grupos
              </button>
            )}
          </div>
        )}
      </div>

      {!isCup && (
        <Modal isOpen={showStandings} onClose={() => setShowStandings(false)} title="Classificação">
          <StandingsTable standings={computeStandings(teams, matches, userTeam.id)} />
        </Modal>
      )}

      {isCup && userGroup && (
        <Modal isOpen={showStandings} onClose={() => setShowStandings(false)} title={userGroup.name}>
          <StandingsTable standings={computeGroupStandings(userGroup, teams, matches)} />
        </Modal>
      )}
    </Screen>
  );
}
