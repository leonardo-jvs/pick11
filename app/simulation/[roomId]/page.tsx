"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Screen } from "@/components/layout/Screen";
import { Modal } from "@/components/ui/Modal";
import { TopListTable } from "@/components/features/league/TopListTable";
import { ROUTES } from "@/constants/routes";
import { LEAGUE_CONFIG, LIVE_MATCH_CONFIG, BOOST_LABELS, X1_CONFIG, LEAGUE_KNOCKOUT_CONFIG } from "@/constants/game";
import { useSessionStore } from "@/store/sessionStore";
import { computeStandings, computeTopScorers, computeTopAssists } from "@/services/leagueService";
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

function buildBeats(match: Match): Beat[] {
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
  const isLeagueKnockout = room?.gameMode === "league_knockout";
  const isX1 = room?.gameMode === "x1";
  // Mesmo sinal usado na Pré-Partida: fase de mata-mata de verdade é Copa
  // pura sempre, ou Liga + Mata-Mata só depois que o cupState existe
  // (transição feita pelo servidor ao fim da 18ª rodada da liga). No X1, o
  // cupState só existe quando o agregado empatou (disputa de pênaltis).
  const inKnockoutStage = !!cupState;

  const [visibleCount, setVisibleCount] = useState(0);
  const [phase, setPhase] = useState<"narration" | "penalties" | "stats">("narration");
  const [visiblePenaltyKicks, setVisiblePenaltyKicks] = useState(0);
  const [showStats, setShowStats] = useState(false);
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

  // Liga + Mata-Mata: a partir do rebaixamento/mata-mata, TODOS os
  // participantes acompanham a MESMA partida decisiva — inclusive quem não
  // está jogando nela. `currentDecisiveIndex` já foi incrementado pelo
  // servidor assim que a partida foi resolvida, então a partida que "acabou
  // de acontecer" (a que esta tela narra) é sempre a de índice
  // `currentDecisiveIndex - 1`, nunca o índice atual (esse é o da PRÓXIMA
  // partida, que é assunto da Pré-Partida, não daqui).
  const isDecisiveSequence = isLeagueKnockout && !!cupState?.decisiveOrder;
  const justResolvedKnockoutEntry = useMemo(() => {
    if (!isDecisiveSequence || !cupState?.decisiveOrder || cupState.currentDecisiveIndex === undefined || cupState.currentDecisiveIndex <= 0) {
      return null;
    }
    const justResolvedId = cupState.decisiveOrder[cupState.currentDecisiveIndex - 1];
    return cupState.knockout.find((m) => m.id === justResolvedId) ?? null;
  }, [isDecisiveSequence, cupState]);

  // A minha partida é sempre a mais recente do histórico envolvendo meu time
  // — o resultado já foi calculado e gravado pelo servidor (Pré-Partida, ao
  // cronômetro compartilhado chegar a zero), aqui só lemos e narramos.
  // Exceção: na sequência decisiva do Liga + Mata-Mata, TODO MUNDO narra a
  // MESMA partida (a que acabou de ser resolvida), não a "minha".
  const userMatch = useMemo(() => {
    if (isDecisiveSequence) {
      if (!justResolvedKnockoutEntry?.matchId) return null;
      return matches.find((m) => m.id === justResolvedKnockoutEntry.matchId) ?? null;
    }
    if (!userTeam) return null;
    const mine = matches.filter((m) => m.homeTeamId === userTeam.id || m.awayTeamId === userTeam.id);
    return mine.length > 0 ? mine[mine.length - 1] : null;
  }, [matches, userTeam?.id, isDecisiveSequence, justResolvedKnockoutEntry?.matchId]);

  const knockoutEntry = useMemo(() => {
    if (!cupState || !userMatch) return null;
    return cupState.knockout.find((k) => k.matchId === userMatch.id) ?? null;
  }, [cupState, userMatch]);

  // Sou eu quem jogou essa partida, ou só estou acompanhando (Liga+Mata-Mata)?
  const isSpectatingThisMatch = isDecisiveSequence && !!knockoutEntry && !!userTeam && knockoutEntry.homeId !== userTeam.id && knockoutEntry.awayId !== userTeam.id;

  const penaltyResult = knockoutEntry?.wentToPenalties && knockoutEntry.penaltyScore
    ? { home: knockoutEntry.penaltyScore[0], away: knockoutEntry.penaltyScore[1] }
    : null;

  const cupOutcome: "none" | "advance" | "champion" | "eliminated" | "relegated" = useMemo(() => {
    if (!inKnockoutStage || !userTeam || !cupState) return "none";
    if (isSpectatingThisMatch) return "none"; // só assistindo — não é resultado pessoal
    if (knockoutEntry) {
      if (knockoutEntry.winnerId !== userTeam.id) {
        return knockoutEntry.phase === "relegation" ? "relegated" : "eliminated";
      }
      return knockoutEntry.phase === "final" ? "champion" : "advance";
    }
    // Sem entrada no mata-mata: ou ainda estamos na fase de grupos (tudo bem,
    // "advance" está certo — ainda tem jogo pela frente), ou o mata-mata já
    // começou e o time do usuário simplesmente não se classificou. Sem essa
    // segunda checagem, um time eliminado na fase de grupos era mandado de
    // volta pra Pré-Partida pra sempre, e o cliente dele ficava sozinho
    // simulando o resto do torneio até acabar, só pra então mostrar a
    // eliminação — daí o "aguarda até o fim da Copa" relatado.
    if (cupState.phase !== "groups" && !cupState.knockout.some((k) => k.homeId === userTeam.id || k.awayId === userTeam.id)) {
      return "eliminated";
    }
    return "advance";
  }, [inKnockoutStage, userTeam, cupState, knockoutEntry, isSpectatingThisMatch]);

  const beats = useMemo(() => (userMatch ? buildBeats(userMatch) : []), [userMatch]);

  // Narra os acontecimentos progressivamente durante ~5s
  useEffect(() => {
    if (beats.length === 0 || phase !== "narration") return;
    if (visibleCount >= beats.length) {
      const toNext = setTimeout(() => setPhase(penaltyResult && knockoutEntry?.penaltyKicks ? "penalties" : "stats"), 400);
      return () => clearTimeout(toNext);
    }
    const interval = Math.max(350, Math.floor((LIVE_MATCH_CONFIG.NARRATION_SECONDS * 1000) / beats.length));
    const t = setTimeout(() => setVisibleCount((c) => c + 1), interval);
    return () => clearTimeout(t);
  }, [beats, visibleCount, phase, penaltyResult, knockoutEntry?.penaltyKicks]);

  // Revela as cobranças de pênalti uma a uma, no mesmo padrão de pausa da
  // narração normal — todos os participantes veem exatamente a mesma
  // sequência, já que `penaltyKicks` vem sincronizado do servidor.
  useEffect(() => {
    if (phase !== "penalties" || !knockoutEntry?.penaltyKicks) return;
    const kicks = knockoutEntry.penaltyKicks;
    if (visiblePenaltyKicks >= kicks.length) {
      const toStats = setTimeout(() => setPhase("stats"), 600);
      return () => clearTimeout(toStats);
    }
    const t = setTimeout(() => setVisiblePenaltyKicks((c) => c + 1), 1100);
    return () => clearTimeout(t);
  }, [phase, knockoutEntry?.penaltyKicks, visiblePenaltyKicks]);

  useEffect(() => {
    setVisiblePenaltyKicks(0);
  }, [knockoutEntry?.matchId]);

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
      setShowStats(false);
      if (isDecisiveSequence) {
        // Liga + Mata-Mata: a navegação é GLOBAL, não depende do resultado
        // pessoal de ninguém — todos avançam juntos pra próxima partida da
        // fila (rebaixamento -> semifinais -> final), e só vão pro
        // encerramento quando a fila inteira (as 5 partidas) tiver acabado.
        // Usa a MESMA tela de encerramento da Liga normal, nunca a da Copa.
        if (cupState?.phase === "finished") {
          router.push(ROUTES.leagueFinal(room.id));
        } else {
          router.push(ROUTES.preMatch(room.id, 1));
        }
      } else if (isX1) {
        // X1: só ida e volta, sem outros confrontos. Depois da 2ª rodada
        // (empatado no agregado ou não — os dois casos já chegam aqui com a
        // competição marcada como encerrada pelo servidor), vai direto pra
        // tela final dedicada e simples do X1, nunca pra leagueFinal/cupFinal.
        if (userMatch.round >= X1_CONFIG.TOTAL_LEGS) {
          router.push(ROUTES.x1Final(room.id));
        } else {
          router.push(ROUTES.preMatch(room.id, userMatch.round + 1));
        }
      } else if (isLeagueKnockout && userMatch.round >= LEAGUE_KNOCKOUT_CONFIG.TOTAL_LEAGUE_ROUNDS) {
        // A 18ª rodada (última da fase de liga) acabou de ser vista, mas o
        // mata-mata ainda não existe (cupState continua null até o host
        // confirmar) — vai pra tela intermediária de encerramento da liga,
        // nunca tenta continuar pra uma "rodada 19" que não existe no
        // calendário (era exatamente isso que travava em "Aguardando o
        // resultado da rodada...").
        router.push(ROUTES.leagueTransition(room.id));
      } else if (isCup) {
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
  }, [phase, room, isCup, isX1, isLeagueKnockout, isDecisiveSequence, inKnockoutStage, cupState?.phase, cupOutcome, userMatch, router]);

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
  const userGroup = isCup && cupState ? cupState.groups.find((g) => g.teamIds.includes(userTeam.id)) ?? null : null;
  const statsStandings = isCup ? (userGroup ? computeGroupStandings(userGroup, teams, matches) : []) : computeStandings(teams, matches, userTeam.id);

  return (
    <Screen center>
      <div className="w-full">
        {phase === "narration" ? (
          <div className="flex flex-col items-center">
            <p className="mb-1 font-sans text-xs text-text-tertiary">
              {userMatch.homeTeamName} <span className="text-text-tertiary">x</span> {userMatch.awayTeamName}
            </p>
            {isSpectatingThisMatch && <p className="mb-2 font-mono text-[10px] text-teal-bright">Você está assistindo</p>}
            {isX1 &&
              userMatch.round === X1_CONFIG.TOTAL_LEGS &&
              (() => {
                const leg1 = matches.find(
                  (m) =>
                    m.round === 1 &&
                    ((m.homeTeamId === userMatch.homeTeamId && m.awayTeamId === userMatch.awayTeamId) ||
                      (m.homeTeamId === userMatch.awayTeamId && m.awayTeamId === userMatch.homeTeamId))
                );
                if (!leg1) return null;
                return (
                  <div className="mb-4 w-full rounded-card border border-border-subtle bg-surface p-3 text-center">
                    <p className="font-sans text-[10px] uppercase tracking-wide text-text-tertiary">Placar agregado</p>
                    <p className="mt-1 font-sans text-sm text-text-secondary">
                      {leg1.homeTeamName} {leg1.homeScore} <span className="text-text-tertiary">x</span> {leg1.awayScore} {leg1.awayTeamName}
                    </p>
                    <p className="mt-1 font-mono text-[10px] text-teal-bright">Segundo jogo</p>
                  </div>
                );
              })()}
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
        ) : phase === "penalties" ? (
          <div className="flex flex-col items-center">
            <p className="mb-1 font-sans text-xs text-text-tertiary">
              {userMatch.homeTeamName} <span className="text-text-tertiary">x</span> {userMatch.awayTeamName}
            </p>
            <p className="mb-4 font-display text-lg tracking-wide text-gold">⚽ Disputa de Pênaltis</p>
            <div className="min-h-[220px] w-full space-y-3 overflow-hidden">
              {(knockoutEntry?.penaltyKicks ?? []).slice(0, visiblePenaltyKicks).map((kick, i) => {
                const kicksSoFar = (knockoutEntry?.penaltyKicks ?? []).slice(0, i + 1);
                const homeGoals = kicksSoFar.filter((k) => k.teamId === userMatch.homeTeamId && k.result === "goal").length;
                const awayGoals = kicksSoFar.filter((k) => k.teamId === userMatch.awayTeamId && k.result === "goal").length;
                const teamName = kick.teamId === userMatch.homeTeamId ? userMatch.homeTeamName : userMatch.awayTeamName;
                const resultText =
                  kick.result === "goal" ? "GOOOOOOL!" : kick.result === "save" ? "DEFENDEU!" : kick.result === "post" ? "NA TRAVE!" : "PRA FORA!";
                return (
                  <div
                    key={i}
                    className={cn(
                      "animate-fade-up rounded-card border px-3 py-2.5 text-center",
                      kick.result === "goal" ? "border-gold/50 bg-gold/10" : "border-border-subtle bg-surface"
                    )}
                  >
                    <p className="font-mono text-[10px] uppercase tracking-wide text-text-tertiary">{teamName}</p>
                    <p className="mt-0.5 font-sans text-sm text-text-secondary">{kick.playerName} foi para a cobrança...</p>
                    <p className={cn("mt-0.5 font-sans text-base font-bold", kick.result === "goal" ? "text-gold" : "text-danger")}>{resultText}</p>
                    <p className="mt-0.5 font-mono text-xs text-text-tertiary">
                      Placar: {homeGoals} x {awayGoals}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div>
            {!isSpectatingThisMatch && (
              (() => {
                const outcome = userScore > opponentScore ? "Vitória" : userScore < opponentScore ? "Derrota" : "Empate";
                const outcomeColor = outcome === "Vitória" ? "text-success" : outcome === "Derrota" ? "text-danger" : "text-warning";
                return <p className={cn("mb-1 text-center font-display text-xl tracking-wide", outcomeColor)}>{outcome}</p>;
              })()
            )}
            <p className="mb-4 text-center font-sans text-xs text-text-tertiary">
              {isCup ? "Copa · Fim de jogo" : inKnockoutStage ? "Mata-mata · Fim de jogo" : `Rodada ${userMatch.round} · Fim de jogo`}
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
                <span className="font-semibold text-text-primary">{userMatch.homeTeamName}:</span>{" "}
                {BOOST_LABELS[(userMatch.homeBoost as Boost | undefined) ?? "Nenhum"]}
                <span className="mx-2 text-text-tertiary">×</span>
                <span className="font-semibold text-text-primary">{userMatch.awayTeamName}:</span>{" "}
                {BOOST_LABELS[(userMatch.awayBoost as Boost | undefined) ?? "Nenhum"]}
              </p>
            </div>

            {inKnockoutStage && cupOutcome === "eliminated" && (
              <p className="mb-3 text-center font-sans text-sm font-semibold text-danger">Eliminado</p>
            )}
            {inKnockoutStage && cupOutcome === "relegated" && (
              <p className="mb-3 text-center font-sans text-sm font-semibold text-danger">⬇️ Rebaixado</p>
            )}
            {inKnockoutStage && cupOutcome === "champion" && (
              <p className="mb-3 text-center font-sans text-sm font-semibold text-gold">🏆 Campeão!</p>
            )}

            <button onClick={() => setShowStats(true)} className="block w-full text-center font-sans text-sm text-gold">
              📊 Estatísticas da Competição
            </button>
          </div>
        )}
      </div>

      <Modal
        isOpen={showStats}
        onClose={() => setShowStats(false)}
        title="📊 Estatísticas da Competição"
        className="max-w-[380px] p-4 sm:max-w-md sm:p-6"
      >
        <div className="grid grid-cols-[1.15fr_1fr] gap-2.5">
          {/* Classificação — coluna maior, à esquerda (mesmos dados já usados na tela de classificação) */}
          <div className="flex max-h-[65vh] flex-col overflow-hidden rounded-card border border-border-subtle bg-surface">
            <p className="shrink-0 border-b border-border-subtle bg-surface-elevated px-2 py-1.5 text-center font-sans text-[9px] font-semibold uppercase tracking-wide text-text-tertiary">
              Classificação
            </p>
            <div className="overflow-y-auto">
              <table className="w-full font-mono text-[10px]">
                <tbody>
                  {statsStandings.length === 0 ? (
                    <tr>
                      <td className="px-2 py-3 text-center text-[10px] text-text-tertiary">Sem classificação nesta fase.</td>
                    </tr>
                  ) : (
                    statsStandings.map((row, i) => (
                      <tr key={row.teamId} className={cn("border-b border-border-subtle/40 last:border-0", row.isUserTeam && "bg-gold/10")}>
                        <td className="px-1.5 py-1 text-text-tertiary">{i + 1}</td>
                        <td className={cn("truncate px-1 py-1", row.isUserTeam ? "font-semibold text-gold" : "text-text-secondary")}>
                          {row.teamName}
                        </td>
                        <td className={cn("px-1.5 py-1 text-right font-bold", row.isUserTeam ? "text-gold" : "text-text-primary")}>
                          {row.points}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Artilharia + Assistências — empilhadas à direita, top 5 cada */}
          <div className="flex flex-col gap-2.5">
            <div>
              <p className="mb-1 text-center font-sans text-[9px] font-semibold uppercase tracking-wide text-text-tertiary">🥇 Artilheiros</p>
              <TopListTable
                compact
                valueLabel="Gols"
                emptyLabel="Sem gols ainda."
                rows={computeTopScorers(matches, 5).map((s) => ({ playerName: s.playerName, teamName: s.teamName, value: s.goals }))}
              />
            </div>
            <div>
              <p className="mb-1 text-center font-sans text-[9px] font-semibold uppercase tracking-wide text-text-tertiary">🎯 Assistentes</p>
              <TopListTable
                compact
                valueLabel="Assist."
                emptyLabel="Sem assistências ainda."
                rows={computeTopAssists(matches, 5).map((a) => ({ playerName: a.playerName, teamName: a.teamName, value: a.assists }))}
              />
            </div>
          </div>
        </div>
      </Modal>
    </Screen>
  );
}
