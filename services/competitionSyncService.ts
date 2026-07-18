import { Room } from "@/types/room";
import { Team, Boost } from "@/types/team";
import { Match } from "@/types/match";
import { DraftState } from "@/types/draft";
import { CupState } from "@/types/cup";
import { getSupabaseClient } from "@/lib/supabase/client";
import { getSquadForParticipant, assignReservesToHumans, getDraftFillerNames } from "@/services/draftService";
import { generateBotSquads, generateSchedule, simulateMatch } from "@/services/leagueService";
import { determineCupTier, initCupState, getQualifiedTeamIds, buildInitialBracket, advancePhaseIfComplete, resolvePenalties } from "@/services/cupService";
import { computeTeamOverall, computeTeamCompatibilityStars } from "@/services/compatibilityService";
import { applyBoost } from "@/services/matchPrepService";
import { createFillerNameGuard } from "@/mocks/syntheticPlayers";
import { generateId, randomBetween } from "@/lib/delay";
import { PRE_MATCH_CONFIG } from "@/constants/game";

const HOME_ADVANTAGE = 1;

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

  const targetTotalTeams = isCup ? determineCupTier(humanTeams.length).totalTeams : undefined;
  const botTeams = await generateBotSquads(remainingPool, humanTeams.length, usedNames, targetTotalTeams, !isCup);
  const allTeams = [...humanTeams, ...botTeams];

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
    round_deadline: new Date(Date.now() + PRE_MATCH_CONFIG.TIMER_SECONDS * 1000).toISOString(),
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
  const freshDeadline = new Date(Date.now() + PRE_MATCH_CONFIG.TIMER_SECONDS * 1000).toISOString();
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

  let penalties: { home: number; away: number } | undefined;
  if (isKnockout && match.homeScore === match.awayScore) {
    const result = resolvePenalties(home, away);
    penalties = { home: result.homeGoals, away: result.awayGoals };
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
        round_deadline: new Date(Date.now() + PRE_MATCH_CONFIG.TIMER_SECONDS * 1000).toISOString(),
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
        round_deadline: nextPhase === "finished" ? null : new Date(Date.now() + PRE_MATCH_CONFIG.TIMER_SECONDS * 1000).toISOString(),
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

  return submitCompetitionState(roomId, snapshot.version, {
    teams: updatedTeams,
    matches: [...snapshot.matches, ...results],
    current_round: isLastRound ? snapshot.currentRound : snapshot.currentRound + 1,
    phase: isLastRound ? "finished" : "pre_match",
    round_readiness: {},
    round_deadline: isLastRound ? null : new Date(Date.now() + PRE_MATCH_CONFIG.TIMER_SECONDS * 1000).toISOString(),
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
