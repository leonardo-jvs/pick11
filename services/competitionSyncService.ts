import { Room } from "@/types/room";
import { Team, Boost } from "@/types/team";
import { Match } from "@/types/match";
import { DraftState } from "@/types/draft";
import { CupState, CupPhase, CupKnockoutMatch, PenaltyKick } from "@/types/cup";
import { getSupabaseClient } from "@/lib/supabase/client";
import { getSquadForParticipant, assignReservesToHumans, getDraftFillerNames } from "@/services/draftService";
import { generateBotSquads, generateSchedule, simulateMatch, computeStandings } from "@/services/leagueService";
import { determineCupTier, initCupState, getQualifiedTeamIds, buildInitialBracket, advancePhaseIfComplete, simulatePenaltyShootout } from "@/services/cupService";
import { computeTeamOverall, computeTeamCompatibilityStars } from "@/services/compatibilityService";
import { applyBoost } from "@/services/matchPrepService";
import { createFillerNameGuard } from "@/mocks/syntheticPlayers";
import { generateId, randomBetween } from "@/lib/delay";
import { PRE_MATCH_CONFIG, LEAGUE_KNOCKOUT_CONFIG, X1_CONFIG } from "@/constants/game";

const HOME_ADVANTAGE = 1;

/**
 * Prazo da Pré-Partida: 10s no Singleplayer (inalterado), 5s no Multiplayer.
 * Um único lugar decide isso — reutilizado em todo cálculo de round_deadline
 * deste arquivo, pra nunca divergir entre os pontos de geração/avanço de rodada.
 */
function computePreMatchDeadline(isMultiplayer: boolean): string {
  const seconds = isMultiplayer ? PRE_MATCH_CONFIG.MULTIPLAYER_TIMER_SECONDS : PRE_MATCH_CONFIG.TIMER_SECONDS;
  return new Date(Date.now() + seconds * 1000).toISOString();
}

export type RoundReadiness = Record<string, { ready: boolean; boost: string }>;

export interface CompetitionSnapshot {
  teams: Team[];
  schedule: { round: number; homeId: string; awayId: string }[] | null;
  cupState: CupState | null;
  matches: Match[];
  currentRound: number;
  phase: "pre_match" | "finished";
  roundReadiness: RoundReadiness;
  roundDeadline: string | null;
  version: number;
}

function mapRow(row: {
  teams: unknown;
  schedule: unknown;
  cup_state: unknown;
  matches: unknown;
  current_round: number;
  phase: "pre_match" | "finished";
  round_readiness: RoundReadiness;
  round_deadline: string | null;
  version: number;
}): CompetitionSnapshot {
  return {
    teams: row.teams as Team[],
    schedule: row.schedule as CompetitionSnapshot["schedule"],
    cupState: row.cup_state as CupState | null,
    matches: row.matches as Match[],
    currentRound: row.current_round,
    phase: row.phase,
    roundReadiness: row.round_readiness ?? {},
    roundDeadline: row.round_deadline,
    version: row.version,
  };
}

/**
 * Só o host chama isso — monta os elencos (reaproveitando exatamente a mesma
 * lógica de sempre: reservas, bots, calendário ou grupos da Copa) e publica
 * no Supabase. Os demais participantes veem `rooms.status` mudar e buscam
 * esse estado assim que ele existir.
 */
export async function startCompetitionOnServer(room: Room, draftState: DraftState): Promise<void> {
  const supabase = getSupabaseClient();
  const isCup = room.gameMode === "cup";
  const isLeagueKnockout = room.gameMode === "league_knockout";
  const isX1 = room.gameMode === "x1";

  // Idempotência: se a competição já existe (ex: uma tentativa anterior
  // conseguiu criar o registro mas falhou antes de atualizar o status da
  // sala, por uma falha de rede pontual), não tenta gerar de novo — isso
  // faria o insert seguinte falhar por violação de chave única (room_id é
  // chave primária) e travaria qualquer nova tentativa num loop de erro. Só
  // garante que o status da sala reflita a competição que já existe.
  const { data: existing, error: existingError } = await supabase
    .from("competition_states")
    .select("room_id")
    .eq("room_id", room.id)
    .maybeSingle();
  if (existingError) throw new Error(existingError.message);

  if (existing) {
    const { error: statusError } = await supabase
      .from("rooms")
      .update({ status: isCup ? "in_cup" : "in_league" })
      .eq("id", room.id);
    if (statusError) throw new Error(statusError.message);
    return;
  }

  const humanParticipants = room.participants.filter((p) => draftState.order.includes(p.id));
  const clubNames = Object.fromEntries(humanParticipants.map((p) => [p.id, p.clubName]));

  const usedNames = new Set([...createFillerNameGuard(), ...getDraftFillerNames()]);
  const { reserves, remainingPool } = isCup
    ? { reserves: {} as Record<string, ReturnType<typeof getSquadForParticipant>>, remainingPool: draftState.pool }
    : assignReservesToHumans(draftState.pool, draftState.order, clubNames, usedNames);

  const humanTeams: Team[] = humanParticipants.map((participant) => {
    const starters = getSquadForParticipant(draftState, participant.id);
    const participantReserves = isCup ? [] : reserves[participant.id] ?? [];
    const squad = [...starters, ...participantReserves];
    return {
      id: generateId("team"),
      ownerId: participant.id,
      ownerName: participant.name,
      clubName: participant.clubName,
      isHuman: true,
      tactics: participant.tactics,
      starters,
      reserves: participantReserves,
      squad,
      overall: computeTeamOverall(squad, participant.tactics),
      compatibilityStars: computeTeamCompatibilityStars(squad, participant.tactics),
      physical: 100,
    };
  });

  const targetTotalTeams = isCup
    ? determineCupTier(humanTeams.length).totalTeams
    : isLeagueKnockout
      ? LEAGUE_KNOCKOUT_CONFIG.TOTAL_CLUBS
      : isX1
        ? humanTeams.length // nunca gera bot no X1 — o alvo já é igual ao número de humanos
        : undefined;
  const botTeams = await generateBotSquads(remainingPool, humanTeams.length, usedNames, targetTotalTeams, !isCup);
  const allTeams = [...humanTeams, ...botTeams];

  // generateSchedule já produz exatamente 18 rodadas quando allTeams.length
  // é 10 (turno+returno = 2*(n-1)) — nenhuma lógica nova de calendário
  // necessária pro Liga + Mata-Mata, é a mesma função da Liga normal.
  const schedule = isCup ? null : generateSchedule(allTeams.map((t) => t.id));
  const cupState = isCup ? initCupState(allTeams.map((t) => t.id), humanTeams.length) : null;

  const { error: insertError } = await supabase.from("competition_states").insert({
    room_id: room.id,
    teams: allTeams,
    schedule,
    cup_state: cupState,
    matches: [],
    current_round: 1,
    phase: "pre_match",
    round_readiness: {},
    round_deadline: computePreMatchDeadline(humanTeams.length > 1),
    version: 0,
  });
  // Código 23505 = violação de chave única — outro cliente (ou uma tentativa
  // anterior desta mesma sessão) já criou a competição entre a checagem
  // acima e este insert. Não é um erro de verdade: a competição existe, é só
  // seguir em frente normalmente.
  if (insertError && insertError.code !== "23505") throw new Error(insertError.message);

  const { error: statusError } = await supabase
    .from("rooms")
    .update({ status: isCup ? "in_cup" : "in_league" })
    .eq("id", room.id);
  if (statusError) throw new Error(statusError.message);
}

export async function fetchCompetitionState(roomId: string): Promise<CompetitionSnapshot | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from("competition_states").select("*").eq("room_id", roomId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return mapRow(data);
}

/** Escrita protegida por concorrência otimista — mesmo padrão da Fase 2 (draft_states.turn_version). */
export async function submitCompetitionState(
  roomId: string,
  expectedVersion: number,
  patch: Partial<{
    teams: Team[];
    schedule: CompetitionSnapshot["schedule"];
    cup_state: CupState | null;
    matches: Match[];
    current_round: number;
    phase: "pre_match" | "finished";
    round_readiness: RoundReadiness;
    round_deadline: string | null;
  }>
): Promise<boolean> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("competition_states")
    .update({ ...patch, version: expectedVersion + 1 })
    .eq("room_id", roomId)
    .eq("version", expectedVersion)
    .select("version");
  if (error) throw new Error(error.message);
  return (data?.length ?? 0) > 0;
}

/**
 * O deadline de uma rodada é gravado no exato momento em que a rodada
 * ANTERIOR termina de simular — mas os jogadores só voltam pra Pré-Partida
 * depois de assistir à narração + estatísticas daquela partida (na prática,
 * quase os mesmos 10s do próprio cronômetro da Pré-Partida!). Sem essa
 * função, o prazo já nasceria vencido ou quase vencido pra quem chegasse
 * depois desse tempo — exatamente o "cronômetro começando em 0" relatado.
 *
 * Qualquer cliente que perceba o prazo vencido/quase vencido ao entrar na
 * tela pode renová-lo — protegido pela mesma trava otimista, então mesmo que
 * os dois jogadores de um confronto tentem ao mesmo tempo, só um vence e o
 * outro aceita o resultado via Realtime, sem duplicar nem conflitar.
 */
export async function refreshRoundDeadlineIfStale(roomId: string, snapshot: CompetitionSnapshot): Promise<void> {
  const deadlineMs = snapshot.roundDeadline ? new Date(snapshot.roundDeadline).getTime() : 0;
  const remainingMs = deadlineMs - Date.now();
  if (remainingMs > 2000) return; // ainda sobra tempo de verdade, nada a fazer
  const freshDeadline = computePreMatchDeadline(snapshot.teams.filter((t) => t.isHuman).length > 1);
  try {
    await submitCompetitionState(roomId, snapshot.version, { round_deadline: freshDeadline });
  } catch {
    // Outro cliente já deve ter renovado, ou vai renovar — o Realtime traz o resultado.
  }
}

/** Quais times humanos têm confronto na rodada (Liga) ou fase atual (Copa) — usado pro indicador de prontidão e pra decidir quando simular. */
export function getHumanTeamIdsForRound(snapshot: CompetitionSnapshot): string[] {
  if (snapshot.cupState) {
    const cup = snapshot.cupState;
    if (cup.phase === "groups") {
      const fixtures = cup.groupFixtures.filter((f) => f.round === cup.currentGroupRound);
      const ids = new Set(fixtures.flatMap((f) => [f.homeId, f.awayId]));
      return snapshot.teams.filter((t) => t.isHuman && ids.has(t.id)).map((t) => t.id);
    }
    if (cup.phase !== "finished") {
      const pending = cup.knockout.filter((m) => m.phase === cup.phase && !m.winnerId);
      const ids = new Set(pending.flatMap((m) => [m.homeId, m.awayId]).filter((id): id is string => !!id));
      return snapshot.teams.filter((t) => t.isHuman && ids.has(t.id)).map((t) => t.id);
    }
    return [];
  }
  if (snapshot.schedule) {
    const fixtures = snapshot.schedule.filter((f) => f.round === snapshot.currentRound);
    const ids = new Set(fixtures.flatMap((f) => [f.homeId, f.awayId]));
    return snapshot.teams.filter((t) => t.isHuman && ids.has(t.id)).map((t) => t.id);
  }
  return [];
}

/** Confirma presença do próprio time pra rodada atual (com o bônus escolhido).
 * Qualquer participante pode chamar isso pro seu próprio time — protegido
 * pela mesma trava otimista, então nunca corrompe a leitura de quem mais já
 * confirmou.
 */
export async function submitReadiness(
  roomId: string,
  snapshot: CompetitionSnapshot,
  teamId: string,
  boost: Boost
): Promise<boolean> {
  const nextReadiness: RoundReadiness = { ...snapshot.roundReadiness, [teamId]: { ready: true, boost } };
  return submitCompetitionState(roomId, snapshot.version, { round_readiness: nextReadiness });
}

function playFixture(round: number, home: Team, away: Team, isKnockout: boolean, roundReadiness: RoundReadiness) {
  const homeBoost = (roundReadiness[home.id]?.boost as Boost) ?? "Nenhum";
  const awayBoost = (roundReadiness[away.id]?.boost as Boost) ?? "Nenhum";
  const homeEff = applyBoost(home, homeBoost);
  const awayEff = applyBoost(away, awayBoost);

  const effectiveHome: Team = { ...home, squad: homeEff.squad, overall: homeEff.overall + HOME_ADVANTAGE };
  const effectiveAway: Team = { ...away, squad: awayEff.squad, overall: awayEff.overall };

  const match = simulateMatch(round, effectiveHome, effectiveAway, false);
  match.homeBoost = homeBoost;
  match.awayBoost = awayBoost;

  let penalties: { home: number; away: number; kicks: PenaltyKick[] } | undefined;
  if (isKnockout && match.homeScore === match.awayScore) {
    const result = simulatePenaltyShootout(home, away);
    penalties = { home: result.homeGoals, away: result.awayGoals, kicks: result.kicks };
  }

  const homePhysicalAfter = homeEff.restoresFullPhysicalAfterMatch ? 100 : Math.max(45, homeEff.physical - randomBetween(3, 8));
  const awayPhysicalAfter = awayEff.restoresFullPhysicalAfterMatch ? 100 : Math.max(45, awayEff.physical - randomBetween(3, 8));

  return { match, penalties, homePhysicalAfter, awayPhysicalAfter };
}

/**
 * Calcula a rodada inteira (todos os confrontos — humano x humano, humano x
 * bot, bot x bot — simultaneamente, reaproveitando exatamente a mesma lógica
 * que já existia) e escreve o resultado protegido por concorrência otimista.
 * Qualquer participante conectado pode chamar isso quando todo mundo
 * confirmou ou o prazo vence (não só o host — assim a rodada nunca trava se
 * o host cair da conexão) — a trava garante que, mesmo que vários clientes
 * tentem ao mesmo tempo, a rodada só é simulada uma única vez.
 */
export async function simulateRoundOnServer(roomId: string, snapshot: CompetitionSnapshot): Promise<boolean> {
  const isCup = !!snapshot.cupState;
  const teams = [...snapshot.teams];
  const results: Match[] = [];
  const physicalPatches = new Map<string, number>();

  function applyResult(r: ReturnType<typeof playFixture>) {
    results.push(r.match);
  }

  if (isCup && snapshot.cupState) {
    const cupState = snapshot.cupState;

    // Liga + Mata-Mata: sequência de partidas decisivas (rebaixamento,
    // semifinais, final), uma de cada vez, na ordem exata combinada — TODOS
    // os participantes da sala assistem ao mesmo confronto simultaneamente,
    // não só quem está jogando. Só existe quando `decisiveOrder` foi
    // montado (ver a transição no final da função) — a Copa nunca preenche
    // esse campo, então este bloco nunca roda pra ela; o restante da lógica
    // de Copa (grupos + mata-mata em paralelo) continua abaixo, intocado.
    if (cupState.decisiveOrder && cupState.currentDecisiveIndex !== undefined) {
      if (cupState.currentDecisiveIndex >= cupState.decisiveOrder.length) return true; // já terminou

      const currentMatchId = cupState.decisiveOrder[cupState.currentDecisiveIndex];
      const pending = cupState.knockout.find((m) => m.id === currentMatchId);
      if (!pending || pending.winnerId || !pending.homeId || !pending.awayId) return true;

      const home = teams.find((t) => t.id === pending.homeId);
      const away = teams.find((t) => t.id === pending.awayId);
      if (!home || !away) return true;

      const r = playFixture(900, home, away, true, snapshot.roundReadiness);
      applyResult(r);
      physicalPatches.set(home.id, r.homePhysicalAfter);
      physicalPatches.set(away.id, r.awayPhysicalAfter);

      const winnerId = r.penalties ? (r.penalties.home > r.penalties.away ? home.id : away.id) : r.match.homeScore > r.match.awayScore ? home.id : away.id;
      let updatedKnockout = cupState.knockout.map((m) =>
        m.id === pending.id
          ? {
              ...m,
              matchId: r.match.id,
              winnerId,
              wentToPenalties: !!r.penalties,
              penaltyScore: r.penalties ? ([r.penalties.home, r.penalties.away] as [number, number]) : undefined,
              penaltyKicks: r.penalties?.kicks,
            }
          : m
      );

      // Assim que as DUAS semifinais estiverem resolvidas, preenche os
      // classificados na Final (que já existe no chaveamento, só sem
      // homeId/awayId até este momento) — reaproveita a mesma ideia de
      // "preencher a próxima fase" que a Copa já usa, só que aplicada uma
      // única vez aqui, no meio da fila sequencial.
      if (pending.phase === "semifinal") {
        const semis = updatedKnockout.filter((m) => m.phase === "semifinal");
        if (semis.every((m) => m.winnerId)) {
          const [semi1, semi2] = [...semis].sort((a, b) => a.slot - b.slot);
          updatedKnockout = updatedKnockout.map((m) => (m.phase === "final" ? { ...m, homeId: semi1.winnerId!, awayId: semi2.winnerId! } : m));
        }
      }

      const nextIndex = cupState.currentDecisiveIndex + 1;
      const isLastDecisiveMatch = nextIndex >= cupState.decisiveOrder.length;
      const nextMatch = isLastDecisiveMatch ? null : updatedKnockout.find((m) => m.id === cupState.decisiveOrder![nextIndex]);
      const displayPhase: CupPhase = isLastDecisiveMatch ? "finished" : nextMatch?.phase ?? pending.phase;

      const updatedTeams = teams.map((t) => (physicalPatches.has(t.id) ? { ...t, physical: physicalPatches.get(t.id)! } : t));

      return submitCompetitionState(roomId, snapshot.version, {
        teams: updatedTeams,
        cup_state: { ...cupState, phase: displayPhase, knockout: updatedKnockout, currentDecisiveIndex: nextIndex },
        matches: [...snapshot.matches, ...results],
        phase: isLastDecisiveMatch ? "finished" : "pre_match",
        round_readiness: {},
        round_deadline: isLastDecisiveMatch ? null : computePreMatchDeadline(teams.filter((t) => t.isHuman).length > 1),
      });
    }

    if (cupState.phase === "groups") {
      const fixtures = cupState.groupFixtures.filter((f) => f.round === cupState.currentGroupRound);
      for (const fixture of fixtures) {
        const home = teams.find((t) => t.id === fixture.homeId);
        const away = teams.find((t) => t.id === fixture.awayId);
        if (!home || !away) continue;
        const r = playFixture(cupState.currentGroupRound, home, away, false, snapshot.roundReadiness);
        applyResult(r);
        physicalPatches.set(home.id, r.homePhysicalAfter);
        physicalPatches.set(away.id, r.awayPhysicalAfter);
      }

      const updatedTeams = teams.map((t) => (physicalPatches.has(t.id) ? { ...t, physical: physicalPatches.get(t.id)! } : t));
      const allMatches = [...snapshot.matches, ...results];

      let nextCupState: CupState;
      if (cupState.currentGroupRound < 3) {
        nextCupState = { ...cupState, currentGroupRound: cupState.currentGroupRound + 1 };
      } else {
        const humanCount = teams.filter((t) => t.isHuman).length;
        const tier = determineCupTier(humanCount);
        const qualifiers = getQualifiedTeamIds(cupState.groups, teams, allMatches, tier);
        const knockout = buildInitialBracket(qualifiers, tier.firstKnockoutPhase);
        nextCupState = { ...cupState, phase: tier.firstKnockoutPhase, knockout };
      }

      return submitCompetitionState(roomId, snapshot.version, {
        teams: updatedTeams,
        cup_state: nextCupState,
        matches: allMatches,
        round_readiness: {},
        round_deadline: computePreMatchDeadline(teams.filter((t) => t.isHuman).length > 1),
      });
    }

    if (cupState.phase !== "finished") {
      const currentPhase = cupState.phase;
      const pendingMatches = cupState.knockout.filter((m) => m.phase === currentPhase && !m.winnerId);
      const updatedKnockout = [...cupState.knockout];

      for (const pending of pendingMatches) {
        const home = teams.find((t) => t.id === pending.homeId);
        const away = teams.find((t) => t.id === pending.awayId);
        if (!home || !away || !pending.homeId || !pending.awayId) continue;
        const r = playFixture(900, home, away, true, snapshot.roundReadiness);
        applyResult(r);
        physicalPatches.set(home.id, r.homePhysicalAfter);
        physicalPatches.set(away.id, r.awayPhysicalAfter);

        const winnerId = r.penalties ? (r.penalties.home > r.penalties.away ? home.id : away.id) : r.match.homeScore > r.match.awayScore ? home.id : away.id;
        const idx = updatedKnockout.findIndex((m) => m.id === pending.id);
        updatedKnockout[idx] = {
          ...pending,
          matchId: r.match.id,
          winnerId,
          wentToPenalties: !!r.penalties,
          penaltyScore: r.penalties ? [r.penalties.home, r.penalties.away] : undefined,
          penaltyKicks: r.penalties?.kicks,
        };
      }

      const { knockout: finalKnockout, nextPhase } = advancePhaseIfComplete(updatedKnockout, currentPhase);
      const updatedTeams = teams.map((t) => (physicalPatches.has(t.id) ? { ...t, physical: physicalPatches.get(t.id)! } : t));

      return submitCompetitionState(roomId, snapshot.version, {
        teams: updatedTeams,
        cup_state: { ...cupState, phase: nextPhase, knockout: finalKnockout },
        matches: [...snapshot.matches, ...results],
        phase: nextPhase === "finished" ? "finished" : "pre_match",
        round_readiness: {},
        round_deadline: nextPhase === "finished" ? null : computePreMatchDeadline(teams.filter((t) => t.isHuman).length > 1),
      });
    }

    return true; // já terminou, nada a fazer
  }

  // Liga
  if (!snapshot.schedule) return true;
  const fixtures = snapshot.schedule.filter((f) => f.round === snapshot.currentRound);
  for (const fixture of fixtures) {
    const home = teams.find((t) => t.id === fixture.homeId);
    const away = teams.find((t) => t.id === fixture.awayId);
    if (!home || !away) continue;
    const r = playFixture(snapshot.currentRound, home, away, false, snapshot.roundReadiness);
    applyResult(r);
    physicalPatches.set(home.id, r.homePhysicalAfter);
    physicalPatches.set(away.id, r.awayPhysicalAfter);
  }

  const updatedTeams = teams.map((t) => (physicalPatches.has(t.id) ? { ...t, physical: physicalPatches.get(t.id)! } : t));
  const totalRounds = Math.max(...snapshot.schedule.map((f) => f.round));
  const isLastRound = snapshot.currentRound >= totalRounds;
  const allMatches = [...snapshot.matches, ...results];

  // "Liga + Mata-Mata": ao terminar a última rodada de uma liga de 10 times,
  // não encerra — monta o mata-mata (1ºx4º, 2ºx3º) com os 4 primeiros e
  // transiciona pro cupState. Dali em diante, o próprio bloco de mata-mata
  // acima (idêntico ao da Copa) assume o resto sozinho — nenhuma lógica nova
  // de simulação, só a transição. Liga normal (20 times) nunca passa por
  // aqui, então seu comportamento de "encerrar ao final" continua idêntico.
  if (isLastRound && teams.length === LEAGUE_KNOCKOUT_CONFIG.TOTAL_CLUBS) {
    const standings = computeStandings(updatedTeams, allMatches, updatedTeams[0]?.id ?? "");
    const top4Ids = standings.slice(0, LEAGUE_KNOCKOUT_CONFIG.QUALIFIERS).map((s) => s.teamId);
    // Os 4 últimos, na ordem 7º,8º,9º,10º — buildInitialBracket pareia
    // primeiro-com-último (7ºx10º) e segundo-com-penúltimo (8ºx9º) da lista
    // recebida, exatamente a mesma regra já usada pro chaveamento do título.
    const bottom4Ids = standings.slice(-LEAGUE_KNOCKOUT_CONFIG.RELEGATION_COUNT * 2).map((s) => s.teamId);

    const relegationMatches = buildInitialBracket(bottom4Ids, "relegation");
    const semifinalMatches = buildInitialBracket(top4Ids, "semifinal");
    const finalPlaceholder = { id: generateId("ko"), phase: "final" as const, slot: 0, homeId: null, awayId: null };

    const knockoutCupState: CupState = {
      totalTeams: LEAGUE_KNOCKOUT_CONFIG.TOTAL_CLUBS,
      groupCount: 0,
      groups: [],
      groupFixtures: [],
      currentGroupRound: 3,
      // Fase "visível" inicial é a primeira da fila — a disputa contra o
      // rebaixamento sempre acontece antes das partidas do título.
      phase: "relegation",
      knockout: [...relegationMatches, ...semifinalMatches, finalPlaceholder],
      decisiveOrder: [relegationMatches[0].id, relegationMatches[1].id, semifinalMatches[0].id, semifinalMatches[1].id, finalPlaceholder.id],
      currentDecisiveIndex: 0,
    };
    return submitCompetitionState(roomId, snapshot.version, {
      teams: updatedTeams,
      cup_state: knockoutCupState,
      matches: allMatches,
      current_round: snapshot.currentRound + 1,
      phase: "pre_match",
      round_readiness: {},
      round_deadline: computePreMatchDeadline(teams.filter((t) => t.isHuman).length > 1),
    });
  }

  // X1: depois da volta (2ª rodada), o AGREGADO decide — nunca gol fora,
  // nunca vantagem, nunca classificação. Se empatado, vai direto pra disputa
  // de pênaltis (reaproveita exatamente a mesma `simulatePenaltyShootout` e
  // a mesma estrutura `CupKnockoutMatch` que qualquer outro mata-mata do
  // jogo já usa — a Simulação já sabe renderizar isso sem nenhuma mudança).
  if (isLastRound && teams.length === X1_CONFIG.TOTAL_PLAYERS) {
    const [teamA, teamB] = updatedTeams;
    const aggA = allMatches.reduce((sum, m) => sum + (m.homeTeamId === teamA.id ? m.homeScore : m.awayTeamId === teamA.id ? m.awayScore : 0), 0);
    const aggB = allMatches.reduce((sum, m) => sum + (m.homeTeamId === teamB.id ? m.homeScore : m.awayTeamId === teamB.id ? m.awayScore : 0), 0);

    if (aggA === aggB) {
      const lastLegMatch = results[results.length - 1];
      const pk = simulatePenaltyShootout(teamA, teamB);
      const decider: CupKnockoutMatch = {
        id: generateId("ko"),
        phase: "final",
        slot: 0,
        homeId: teamA.id,
        awayId: teamB.id,
        matchId: lastLegMatch.id,
        winnerId: pk.winnerId,
        wentToPenalties: true,
        penaltyScore: [pk.homeGoals, pk.awayGoals],
        penaltyKicks: pk.kicks,
      };
      const x1CupState: CupState = {
        totalTeams: 2,
        groupCount: 0,
        groups: [],
        groupFixtures: [],
        currentGroupRound: 3,
        phase: "finished",
        knockout: [decider],
      };
      return submitCompetitionState(roomId, snapshot.version, {
        teams: updatedTeams,
        cup_state: x1CupState,
        matches: allMatches,
        current_round: snapshot.currentRound,
        phase: "finished",
        round_readiness: {},
        round_deadline: null,
      });
    }
    // Agregado não empatou: só encerra normalmente — cai no retorno genérico abaixo.
  }

  return submitCompetitionState(roomId, snapshot.version, {
    teams: updatedTeams,
    matches: allMatches,
    current_round: isLastRound ? snapshot.currentRound : snapshot.currentRound + 1,
    phase: isLastRound ? "finished" : "pre_match",
    round_readiness: {},
    round_deadline: isLastRound ? null : computePreMatchDeadline(teams.filter((t) => t.isHuman).length > 1),
  });
}

/**
 * "Nova Liga" — só o host chama. Apaga o estado da competição e do draft
 * (mantendo a sala e os participantes) e devolve todo mundo pro Lobby pronto
 * pra um novo Draft.
 */
export async function resetCompetition(roomId: string): Promise<void> {
  const supabase = getSupabaseClient();
  // Sinaliza a sala como "lobby" primeiro — se algo falhar no meio da limpeza
  // abaixo, ninguém fica preso lendo dados de uma competição que já não
  // deveria mais existir. O host pode simplesmente tentar de novo.
  const { error: statusError } = await supabase.from("rooms").update({ status: "lobby" }).eq("id", roomId);
  if (statusError) throw new Error(statusError.message);

  // Zerar o "pronto" de TODOS os participantes num update só não funciona: a
  // política de RLS de room_participants só deixa cada usuário alterar a
  // própria linha (de propósito — nenhum cliente pode mexer no dado de
  // outro). Um update em massa aqui silenciosamente só afetaria a linha do
  // próprio host, deixando todo mundo mais com o "pronto" antigo — o Draft
  // podia então começar sozinho sem ninguém ter confirmado de verdade pra
  // nova competição. Por isso cada cliente reseta a própria prontidão ao
  // detectar que a sala voltou pro Lobby (ver app/lobby/[roomId]/page.tsx).
  await supabase.from("competition_states").delete().eq("room_id", roomId);
  await supabase.from("draft_states").delete().eq("room_id", roomId);
}
