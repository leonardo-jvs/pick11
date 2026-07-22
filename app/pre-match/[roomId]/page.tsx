"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { Zap, Shield, BedDouble, Check, Lock, GitBranch } from "lucide-react";
import { Screen } from "@/components/layout/Screen";
import { Button } from "@/components/ui/Button";
import { Timer } from "@/components/ui/Timer";
import { FormationPitch } from "@/components/features/league/FormationPitch";
import { ROUTES } from "@/constants/routes";
import { SELECTABLE_BOOSTS, BOOST_USES, BOOST_LABELS, BOOST_POSITION_TARGETS, BOOST_OVERALL_BONUS, PRE_MATCH_CONFIG, LEAGUE_CONFIG } from "@/constants/game";
import { useSessionStore } from "@/store/sessionStore";
import { computeStandings } from "@/services/leagueService";
import { getCurrentFixtureForTeam, getPhaseLabel, computeGroupStandings } from "@/services/cupService";
import {
  submitReadiness,
  simulateRoundOnServer,
  getHumanTeamIdsForRound,
  fetchCompetitionState,
  refreshRoundDeadlineIfStale,
  CompetitionSnapshot,
} from "@/services/competitionSyncService";
import { fetchRoom } from "@/services/roomService";
import { countBoostUsage } from "@/services/matchPrepService";
import { ensureAnonymousSession } from "@/lib/supabase/auth";
import { useCompetitionRealtime } from "@/hooks/useCompetitionRealtime";
import { toast } from "@/store/toastStore";
import { Boost } from "@/types/team";
import { Position } from "@/types/player";
import { cn, getPhysicalColorClass } from "@/lib/utils";

const ALL_POSITIONS: Position[] = ["GOL", "ZAG", "LAT", "VOL", "MEI", "ATA"];

const BOOST_ICON: Record<Boost, React.ReactNode> = {
  Nenhum: <Zap size={16} />,
  Bicho: <Zap size={16} />,
  "Jogo importante": <Shield size={16} />,
  "Poupar elenco": <BedDouble size={16} />,
};

const BOOST_DESCRIPTION: Record<Boost, string> = {
  Nenhum: "Joga sem nenhum bônus especial.",
  Bicho: "+3 Overall para atacantes e meias. Ideal para jogos equilibrados.",
  "Jogo importante": "+3 Overall para defensores. Ideal contra times fortes.",
  "Poupar elenco":
    "Os titulares são poupados nesta rodada. Todos os jogadores da equipe entram em campo com -3 de Overall, reduzindo significativamente as chances de vitória. Em compensação, todo o elenco titular retorna com 100% de físico para a próxima rodada.",
};

export default function PreMatchPage() {
  const router = useRouter();
  const params = useParams<{ roomId: string }>();
  const room = useSessionStore((s) => s.room);
  const setRoom = useSessionStore((s) => s.setRoom);
  const setSelfParticipantId = useSessionStore((s) => s.setSelfParticipantId);
  const teams = useSessionStore((s) => s.teams);
  const schedule = useSessionStore((s) => s.schedule);
  const matches = useSessionStore((s) => s.matches);
  const currentRound = useSessionStore((s) => s.currentRound);
  const cupState = useSessionStore((s) => s.cupState);
  const roundReadiness = useSessionStore((s) => s.roundReadiness);
  const competitionVersion = useSessionStore((s) => s.competitionVersion);
  const competitionDeadline = useSessionStore((s) => s.competitionDeadline);
  const userTeam = useSessionStore((s) => s.userTeam());

  const isCup = room?.gameMode === "cup";
  // Singleplayer é sempre sala de 1 jogador — mantém o fluxo antigo (botão
  // "Iniciar Partida"). Multiplayer nunca mostra esse botão (item 6).
  const isSolo = !!room && room.maxPlayers === 1;

  const [lockedBoost, setLockedBoost] = useState<Boost | null>(null);
  const [starting, setStarting] = useState(false);
  const [reconnecting, setReconnecting] = useState(true);

  // Reconexão: se a store estiver vazia (F5 no meio da Liga/Copa), busca a
  // sala e o estado da competição direto do Supabase.
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

  // Única fonte de sincronização de dados desta tela — substitui qualquer
  // busca solta. Escuta em tempo real e mantém teams/schedule/cupState/
  // matches/currentRound/roundReadiness/deadline sempre espelhando o servidor.
  useCompetitionRealtime(room?.id ?? null);

  // Detecta quando a MINHA partida da rodada atual foi simulada (mesmo que eu
  // não tenha feito nada — o prazo compartilhado pode ter vencido em outro
  // cliente) comparando quantas partidas do meu time existiam quando entrei
  // nesta tela contra quantas existem agora.
  const myMatchCountRef = useRef<number | null>(null);
  useEffect(() => {
    if (!userTeam) return;
    const myMatches = matches.filter((m) => m.homeTeamId === userTeam.id || m.awayTeamId === userTeam.id);
    if (myMatchCountRef.current === null) {
      myMatchCountRef.current = myMatches.length;
      return;
    }
    if (myMatches.length > myMatchCountRef.current && room) {
      const justPlayedRound = myMatches[myMatches.length - 1].round;
      router.push(ROUTES.simulation(room.id, justPlayedRound));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matches, userTeam?.id]);

  // O tempo restante do Multiplayer SEMPRE vem do deadline gravado no
  // servidor — nunca de um contador local independente (item 2/4 da sprint
  // anterior). No Singleplayer não existe ninguém pra sincronizar, então usar
  // o deadline buscado via rede só introduzia atraso/latência que podia
  // comer os 10 segundos inteiros (o cronômetro "nascendo" já perto de zero).
  // Por isso o Singleplayer usa sempre a contagem cheia, local e imediata.
  const timerSeconds = useMemo(() => {
    if (isSolo) return PRE_MATCH_CONFIG.TIMER_SECONDS;
    if (!competitionDeadline) return PRE_MATCH_CONFIG.TIMER_SECONDS;
    return Math.max(0, Math.round((new Date(competitionDeadline).getTime() - Date.now()) / 1000));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSolo, currentRound, cupState?.phase, cupState?.currentGroupRound, competitionDeadline]);

  // Reseta o bônus travado sempre que uma nova rodada/fase começa
  useEffect(() => {
    setLockedBoost(null);
    setStarting(false);
  }, [currentRound, cupState?.phase, cupState?.currentGroupRound]);

  const iAmReady = !!(userTeam && roundReadiness[userTeam.id]?.ready);

  /**
   * Tenta calcular e gravar a rodada inteira no servidor. Qualquer
   * participante pode chamar isso — a trava de concorrência otimista garante
   * que só a primeira tentativa realmente aplica algo; as demais são
   * descartadas silenciosamente. Chamado em dois momentos: (a) assim que
   * todos os humanos da rodada confirmarem, como atalho; (b) sempre que o
   * cronômetro COMPARTILHADO chega a zero, como garantia — igual ao Draft.
   */
  const attemptSimulateRound = useCallback(async () => {
    if (!room || teams.length === 0) return;
    const snapshot: CompetitionSnapshot = {
      teams,
      schedule: schedule.length > 0 ? schedule : null,
      cupState,
      matches,
      currentRound,
      phase: "pre_match",
      roundReadiness,
      roundDeadline: competitionDeadline,
      version: competitionVersion,
    };
    try {
      await simulateRoundOnServer(room.id, snapshot);
    } catch {
      // Outro cliente já deve estar fazendo isso, ou o Realtime vai trazer o
      // resultado logo em seguida — nada a fazer aqui.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.id, teams, schedule, cupState, matches, currentRound, roundReadiness, competitionDeadline, competitionVersion]);

  // Atalho: dispara mais cedo se todos os humanos da rodada já confirmaram.
  // Qualquer cliente conectado pode tentar isso — é isso que garante que a
  // rodada nunca trava, mesmo se algum jogador específico cair da conexão.
  // A trava de concorrência otimista impede duplicação mesmo com vários
  // clientes tentando ao mesmo tempo.
  useEffect(() => {
    if (!room || teams.length === 0) return;
    const snapshot: CompetitionSnapshot = {
      teams,
      schedule: schedule.length > 0 ? schedule : null,
      cupState,
      matches,
      currentRound,
      phase: "pre_match",
      roundReadiness,
      roundDeadline: competitionDeadline,
      version: competitionVersion,
    };
    const humanIds = getHumanTeamIdsForRound(snapshot);
    const everyoneReady = humanIds.length > 0 && humanIds.every((id) => roundReadiness[id]?.ready);
    if (everyoneReady) attemptSimulateRound();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundReadiness]);

  // Se o prazo da rodada já nasceu vencido (ex: chegamos aqui depois de
  // assistir ~10s de narração/estatísticas da rodada anterior, tempo
  // suficiente pra "comer" o próprio cronômetro de 10s da Pré-Partida),
  // renova. Só no Multiplayer — Singleplayer usa cronômetro local, não
  // depende disso. Uma tentativa por rodada; a trava otimista evita conflito
  // se os dois jogadores de um confronto chegarem e tentarem ao mesmo tempo.
  const deadlineCheckedForRef = useRef<string | null>(null);
  useEffect(() => {
    if (isSolo || !room || teams.length === 0) return;
    const roundKey = `${currentRound}-${cupState?.phase}-${cupState?.currentGroupRound}`;
    if (deadlineCheckedForRef.current === roundKey) return;
    deadlineCheckedForRef.current = roundKey;

    const snapshot: CompetitionSnapshot = {
      teams,
      schedule: schedule.length > 0 ? schedule : null,
      cupState,
      matches,
      currentRound,
      phase: "pre_match",
      roundReadiness,
      roundDeadline: competitionDeadline,
      version: competitionVersion,
    };
    refreshRoundDeadlineIfStale(room.id, snapshot);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSolo, room?.id, teams.length, currentRound, cupState?.phase, cupState?.currentGroupRound]);

  // Rede de segurança: se a competição já terminou (Copa com fase "finished",
  // ou Liga que já passou da última rodada) a Pré-Partida nunca deve tentar
  // mostrar um confronto — sai imediatamente pra tela de encerramento certa.
  // Sem isso, um time cuja participação já acabou (eliminado ou campeão) podia
  // ficar preso aqui mostrando "aguardando confronto" pra sempre, porque não
  // existe mesmo nenhum próximo adversário. Vale igual pra Singleplayer e
  // Multiplayer — não é um comportamento exclusivo de nenhum dos dois.
  //
  // IMPORTANTE: quando a PRÓPRIA final da Copa é resolvida, `cupState.phase`
  // vira "finished" no MESMO instante em que a partida final aparece em
  // `matches` — os dois efeitos disparavam juntos, e este aqui vencia a
  // corrida, mandando o jogador direto pro encerramento e pulando a tela de
  // Simulação da final. Por isso só redireciona direto se não sobrar nenhum
  // resultado novo/ainda não visto — se sobrar, deixa o efeito de detecção de
  // partida (acima) levar o jogador pra Simulação primeiro, como sempre.
  useEffect(() => {
    if (!room || teams.length === 0) return;
    if (isCup) {
      if (cupState?.phase === "finished") {
        const myMatches = userTeam ? matches.filter((m) => m.homeTeamId === userTeam.id || m.awayTeamId === userTeam.id) : [];
        const hasUnseenMatch = myMatchCountRef.current !== null && myMatches.length > myMatchCountRef.current;
        if (!hasUnseenMatch) router.push(ROUTES.cupFinal(room.id));
      }
    } else if (schedule.length > 0) {
      const totalRounds = Math.max(...schedule.map((f) => f.round));
      if (currentRound > totalRounds) router.push(ROUTES.leagueFinal(room.id));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.id, teams.length, isCup, cupState?.phase, schedule, currentRound, matches, userTeam?.id]);

  if (reconnecting) {
    return (
      <Screen center>
        <div className="size-6 animate-spin rounded-full border-2 border-border-strong border-t-gold" />
      </Screen>
    );
  }

  if (!room || !userTeam || teams.length === 0) {
    return (
      <Screen center>
        <p className="mb-4 font-sans text-sm text-text-secondary">Nenhuma liga em andamento.</p>
        <button onClick={() => router.push(ROUTES.roomHub)} className="font-sans text-sm text-gold">
          Voltar ao menu multiplayer
        </button>
      </Screen>
    );
  }

  let opponent: (typeof teams)[number] | null = null;
  let isHome = false;
  let cupFixtureInfo: string | null = null;
  let groupStandingPosition: number | null = null;

  if (isCup && cupState) {
    const fixture = getCurrentFixtureForTeam(cupState, userTeam.id);
    opponent = fixture ? teams.find((t) => t.id === fixture.opponentId) ?? null : null;
    isHome = fixture?.isHome ?? false;
    cupFixtureInfo = fixture?.context ?? getPhaseLabel(cupState.phase);
    if (cupState.phase === "groups") {
      const group = cupState.groups.find((g) => g.teamIds.includes(userTeam.id));
      if (group) {
        const groupStandings = computeGroupStandings(group, teams, matches);
        groupStandingPosition = groupStandings.findIndex((s) => s.teamId === userTeam.id) + 1;
      }
    }
  } else {
    const fixture = schedule.find((f) => f.round === currentRound && (f.homeId === userTeam.id || f.awayId === userTeam.id));
    opponent = fixture ? teams.find((t) => t.id === (fixture.homeId === userTeam.id ? fixture.awayId : fixture.homeId)) ?? null : null;
    isHome = fixture?.homeId === userTeam.id;
  }

  const standings = computeStandings(teams, matches, userTeam.id);
  const position = standings.findIndex((s) => s.teamId === userTeam.id) + 1;

  const activeBoost = lockedBoost ?? "Nenhum";
  const isPouparElenco = activeBoost === "Poupar elenco";
  const boostedPositions: Position[] | undefined = isPouparElenco
    ? ALL_POSITIONS
    : (BOOST_POSITION_TARGETS[activeBoost] as Position[] | undefined);
  const boostDelta = isPouparElenco ? -BOOST_OVERALL_BONUS : BOOST_OVERALL_BONUS;

  const opponentReady = !!(opponent && roundReadiness[opponent.id]?.ready);

  function isBoostDisabled(boost: Boost) {
    if (lockedBoost !== null || iAmReady || !userTeam) return true;
    const limit = BOOST_USES[boost];
    if (limit === null) return false;
    return countBoostUsage(matches, userTeam.id, boost) >= limit;
  }

  function boostUsesLabel(boost: Boost) {
    if (!userTeam) return null;
    const limit = BOOST_USES[boost];
    if (limit === null) return null;
    const used = countBoostUsage(matches, userTeam.id, boost);
    return `${Math.max(0, limit - used)}/${limit} usos`;
  }

  async function submitMyReadiness(boost: Boost) {
    if (!room || !userTeam) return;
    let snapshot: CompetitionSnapshot = {
      teams,
      schedule: schedule.length > 0 ? schedule : null,
      cupState,
      matches,
      currentRound,
      phase: "pre_match",
      roundReadiness,
      roundDeadline: competitionDeadline,
      version: competitionVersion,
    };
    // Se outro jogador confirmou no mesmo instante, a escrita otimista perde
    // a corrida — busca o estado mais fresco e tenta de novo.
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const accepted = await submitReadiness(room.id, snapshot, userTeam.id, boost);
        if (accepted) return;
        const fresh = await fetchCompetitionState(room.id);
        if (!fresh) return;
        if (fresh.roundReadiness[userTeam.id]?.ready) return;
        snapshot = fresh;
      } catch (e) {
        toast.urgent(e instanceof Error ? e.message : "Não foi possível confirmar. Tente de novo.");
        return;
      }
    }
  }

  function handleSelectBoost(boost: Boost) {
    if (lockedBoost !== null || iAmReady) return;
    setLockedBoost(boost);
    // Multiplayer: escolher o bônus já confirma presença na hora — não existe
    // mais um botão separado de "Iniciar Partida" (item 6). Singleplayer
    // continua exigindo o clique no botão, como sempre funcionou.
    if (!isSolo) submitMyReadiness(boost);
  }

  async function handleStartSolo() {
    if (starting || iAmReady || !room || !userTeam) return;
    setStarting(true);
    const boost = lockedBoost ?? "Nenhum";
    await submitMyReadiness(boost);
    setStarting(false);
  }

  return (
    <Screen withField center>
      <div className="w-full">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="font-sans text-xs text-text-tertiary">
              {isCup ? cupFixtureInfo : `Rodada ${currentRound} de ${LEAGUE_CONFIG.TOTAL_ROUNDS}`}
            </p>
            <h1 className="font-display text-2xl tracking-wide text-text-primary">
              {userTeam.clubName} <span className="text-text-tertiary">{isHome ? "🏠" : "✈️"}</span>{" "}
              {opponent?.clubName ?? <span className="text-text-tertiary">Aguardando confronto...</span>}
            </h1>
            {isCup && cupState && cupState.phase !== "groups" && (
              <button
                onClick={() => router.push(ROUTES.cupBracket(room.id))}
                className="mt-1 flex items-center gap-1 font-sans text-[11px] text-teal-bright hover:underline"
              >
                <GitBranch size={11} /> Ver chaveamento
              </button>
            )}
          </div>
          {/* O Timer continua montado (roda exatamente os mesmos 10s
              internamente, disparando a simulação da rodada normalmente) —
              só nunca é exibido visualmente, pra ninguém. */}
          <div className="sr-only" aria-hidden="true">
            <Timer
              seconds={timerSeconds}
              resetKey={`${currentRound}-${cupState?.phase}-${cupState?.currentGroupRound}`}
              onComplete={attemptSimulateRound}
              size={112}
            />
          </div>
        </div>

        {!isSolo && <p className="-mt-2 mb-4 font-sans text-xs text-text-tertiary">A partida começa em 5 segundos.</p>}

        <div className="mb-4 grid grid-cols-4 gap-2">
          <div className="rounded-card border border-border-subtle bg-surface p-2.5 text-center">
            <p className="font-sans text-[10px] text-text-tertiary">{isCup ? "Fase" : "Rodada"}</p>
            <p className="font-display text-lg leading-tight text-text-primary">
              {isCup ? (cupState ? getPhaseLabel(cupState.phase) : "—") : currentRound}
            </p>
          </div>
          <div className="rounded-card border border-border-subtle bg-surface p-2.5 text-center">
            <p className="font-sans text-[10px] text-text-tertiary">{isCup && cupState?.phase === "groups" ? "No grupo" : "Classificação"}</p>
            <p className="font-display text-2xl text-teal-bright">
              {isCup ? (cupState?.phase === "groups" ? (groupStandingPosition ? `${groupStandingPosition}º` : "—") : "—") : `${position}º`}
            </p>
          </div>
          <div className="rounded-card border border-border-subtle bg-surface p-2.5 text-center">
            <p className="font-sans text-[10px] text-text-tertiary">Físico</p>
            <p className={cn("font-display text-2xl", getPhysicalColorClass(userTeam.physical))}>{userTeam.physical}%</p>
          </div>
          <div className="rounded-card border border-border-subtle bg-surface p-2.5 text-center">
            <p className="font-sans text-[10px] text-text-tertiary">Overall</p>
            <p className="font-display text-2xl text-gold">{userTeam.overall}</p>
          </div>
        </div>

        <p className="mb-1.5 font-sans text-xs text-text-tertiary">Escalação titular</p>
        <div className="mb-4">
          <FormationPitch
            formation={userTeam.tactics.formation}
            players={userTeam.starters}
            tactics={userTeam.tactics}
            boostedPositions={boostedPositions}
            boostDelta={boostDelta}
          />
        </div>

        <div className="mb-1.5 flex items-center gap-1.5">
          <p className="font-sans text-xs text-text-tertiary">Escolha um bônus (opcional)</p>
          {(lockedBoost !== null || iAmReady) && <Lock size={11} className="text-text-tertiary" />}
        </div>
        <div className="mb-4 space-y-2">
          {SELECTABLE_BOOSTS.map((boost) => {
            const disabled = isBoostDisabled(boost);
            const usesLabel = boostUsesLabel(boost);
            const selected = lockedBoost === boost;
            return (
              <button
                key={boost}
                type="button"
                disabled={disabled && !selected}
                onClick={() => handleSelectBoost(boost)}
                className={cn(
                  "flex w-full items-start gap-3 rounded-card border px-3 py-2.5 text-left transition-colors",
                  selected ? "border-gold bg-gold/10" : "border-border-subtle bg-surface hover:border-border-strong",
                  disabled && !selected && "cursor-not-allowed opacity-40"
                )}
              >
                <span className={cn("mt-0.5", selected ? "text-gold" : "text-text-tertiary")}>{BOOST_ICON[boost]}</span>
                <span className="flex-1">
                  <span className="flex items-center justify-between">
                    <span className={cn("font-sans text-sm font-semibold", selected ? "text-gold" : "text-text-primary")}>{BOOST_LABELS[boost]}</span>
                    {usesLabel && <span className="font-mono text-[10px] text-text-tertiary">{usesLabel}</span>}
                  </span>
                  <span className="mt-0.5 block font-sans text-[11px] leading-snug text-text-tertiary">{BOOST_DESCRIPTION[boost]}</span>
                </span>
                {selected && <Check size={16} className="mt-0.5 shrink-0 text-gold" />}
              </button>
            );
          })}
        </div>

        {isSolo ? (
          <Button fullWidth size="lg" isLoading={starting && !iAmReady} disabled={iAmReady} onClick={handleStartSolo}>
            {iAmReady ? "Aguardando..." : "Iniciar Partida"}
          </Button>
        ) : (
          <div className="rounded-card border border-border-subtle bg-surface p-3 text-center">
            <p className="font-sans text-xs text-text-secondary">
              {iAmReady ? "Confirmado — " : "Escolha um bônus ou aguarde — "}
              a partida de todos os confrontos começa junto quando o cronômetro chegar a zero.
            </p>
            {opponent?.isHuman && (
              <p className="mt-1 font-mono text-[11px] text-teal-bright">
                {opponentReady ? "Adversário já confirmou" : "Aguardando confirmação do adversário"}
              </p>
            )}
          </div>
        )}
      </div>
    </Screen>
  );
}
