import { DraftState, DraftPick, DraftTurn } from "@/types/draft";
import { Player } from "@/types/player";
import { RoomParticipant, TeamTactics } from "@/types/team";
import { buildLeaguePlayerPool } from "@/services/playerRepository";
import { DRAFT_CONFIG } from "@/constants/game";
import { toDraftPlayerCard } from "@/services/compatibilityService";
import { findBestSlot, getFormationSlots } from "@/services/formationService";
import { generateFillerPlayers, createFillerNameGuard } from "@/mocks/syntheticPlayers";
import { buildReserveSquad } from "@/services/squadBuilderService";
import { drawWeightedByCategory } from "@/services/cardDrawService";
import { delay } from "@/lib/delay";

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Monta a sequência completa de rodadas do snake draft. Cada participante joga
 * ceil(11/2) = 6 rodadas: 5 rodadas de 2 escolhas + 1 rodada final de 1 escolha
 * (11 é ímpar). A ordem alterna a cada rodada (snake) — EXCETO com exatamente
 * 2 jogadores, onde a inversão da serpentina tradicional faz o mesmo jogador
 * cair duas vezes seguidas na virada de cada rodada (round N termina com o
 * jogador 2, e o round N+1 invertido começa com o jogador 2 de novo) — o
 * cronômetro reinicia corretamente nesse caso, mas a experiência fica confusa
 * (a mesma pessoa escolhe duas vezes seguidas, sem nenhuma pausa perceptível
 * pra "vez do outro"). Com só 2 jogadores, a ordem simplesmente nunca inverte:
 * A, B, A, B... — cada um sempre escolhe uma vez por rodada, alternando limpo.
 */
function buildTurnSequence(order: string[]): DraftTurn[] {
  const turns: DraftTurn[] = [];
  const totalMetaRounds = Math.ceil(DRAFT_CONFIG.STARTERS_DRAFTED / DRAFT_CONFIG.PICKS_PER_ROUND);
  const isTwoPlayerRoom = order.length === 2;
  let index = 0;

  for (let round = 0; round < totalMetaRounds; round++) {
    const picksAlreadyAssigned = round * DRAFT_CONFIG.PICKS_PER_ROUND;
    const requiredPicks = Math.min(DRAFT_CONFIG.PICKS_PER_ROUND, DRAFT_CONFIG.STARTERS_DRAFTED - picksAlreadyAssigned);
    const roundOrder = isTwoPlayerRoom || round % 2 === 0 ? order : [...order].reverse();
    for (const participantId of roundOrder) {
      turns.push({ index: index++, participantId, requiredPicks });
    }
  }

  return turns;
}

// Um único guard de nomes por sessão de Draft — resetado a cada initDraft(),
// nunca criado do zero a cada chamada da rede de segurança abaixo. Isso é o
// que garante que, mesmo disparando dezenas de vezes numa liga com muita
// escassez de posição (ex: 10 jogadores), os fillers injetados no pool nunca
// repetem nome entre si.
let draftFillerNameGuard = createFillerNameGuard();

/** Nomes fictícios já usados nesta sessão de Draft — a tela de Gerando Liga usa isso pra nunca repetir um nome já visto durante o Draft. */
export function getDraftFillerNames(): Set<string> {
  return draftFillerNameGuard;
}

/**
 * Rede de segurança do Bug 2: se o pool restante não tiver NENHUM jogador capaz
 * de ocupar as vagas abertas do participante (escassez real de uma posição),
 * sintetiza um jogador de reforço com uma das posições ainda vagas e o injeta
 * no pool. Garante estruturalmente que sempre existirá pelo menos 1 opção
 * válida — o Draft nunca pode ficar impossível de continuar.
 */
function ensurePoolHasEligiblePlayer(pool: Player[], formation: TeamTactics["formation"], filledSlotIds: Set<string>): Player[] {
  const openSlots = getFormationSlots(formation).filter((s) => !filledSlotIds.has(s.id));
  if (openSlots.length === 0) return pool; // formação já completa, nada a garantir

  let result = pool;

  for (const slot of openSlots) {
    const hasCoverage = result.some(
      (p) =>
        slot.acceptedPositions.includes(p.position) ||
        (p.secondaryPositions ?? []).some((sp) => slot.acceptedPositions.includes(sp))
    );
    if (!hasCoverage) {
      const [filler] = generateFillerPlayers(1, "Free Agent", draftFillerNameGuard, slot.acceptedPositions[0]);
      result = [...result, { ...filler, overall: Math.max(filler.overall, 68) }];
    }
  }

  return result;
}

/**
 * Sorteia os candidatos de uma rodada. Prioridade #1, sempre: garantir pelo
 * menos 1 candidato pra CADA posição que ainda está em aberto na formação —
 * nunca só "pelo menos 1 candidato elegível no total", porque isso permitia
 * o Draft oferecer, por exemplo, 6 atacantes quando o time ainda precisava de
 * ATA + ZAG + LAT, deixando ZAG e LAT sem nenhuma opção naquela rodada. Só
 * depois de cobrir todas as posições em aberto (dentro do orçamento de
 * `count` cartas) é que o resto das vagas usa a mecânica ~70% elegível / 30%
 * qualquer posição de sempre, pra manter o Draft imprevisível.
 */
function drawSmartCandidates(pool: Player[], formation: TeamTactics["formation"], filledSlotIds: Set<string>, count: number): Player[] {
  const eligible: Player[] = [];
  const others: Player[] = [];
  for (const player of pool) {
    if (findBestSlot(player, formation, filledSlotIds)) eligible.push(player);
    else others.push(player);
  }

  // Quais posições (GOL/ZAG/LAT/VOL/MEI/ATA) ainda têm pelo menos um slot vago
  // na formação — é a união das posições aceitas por todo slot ainda não
  // preenchido. Preencher QUALQUER slot que aceite aquela posição já conta.
  const openPositions = new Set(
    getFormationSlots(formation)
      .filter((slot) => !filledSlotIds.has(slot.id))
      .flatMap((slot) => slot.acceptedPositions)
  );

  const guaranteed: Player[] = [];
  const guaranteedIds = new Set<string>();
  // Ordem aleatória: se houver mais posições em aberto do que cartas no
  // orçamento, não é sempre a mesma posição que fica de fora.
  for (const position of shuffle([...openPositions])) {
    if (guaranteed.length >= count) break;
    const candidatesForPosition = eligible.filter(
      (p) => !guaranteedIds.has(p.id) && (p.position === position || p.secondaryPositions?.includes(position))
    );
    if (candidatesForPosition.length === 0) continue;
    const [chosen] = drawWeightedByCategory(candidatesForPosition, 1);
    guaranteed.push(chosen);
    guaranteedIds.add(chosen.id);
  }

  // Ordena por raridade de categoria (95% comum / 4% Auge / 1% Lendária) dentro de
  // cada grupo — mantém a mecânica 70/30 de elegibilidade exatamente como estava,
  // só a ORDEM de prioridade dentro de cada grupo passa a respeitar a raridade.
  const remainingEligible = eligible.filter((p) => !guaranteedIds.has(p.id));
  const shuffledEligible = drawWeightedByCategory(remainingEligible, remainingEligible.length);
  const shuffledOthers = drawWeightedByCategory(others, others.length);

  const remainingCount = count - guaranteed.length;
  const eligibleTarget = Math.round(remainingCount * 0.7);
  const othersTarget = remainingCount - eligibleTarget;

  const picked = [...guaranteed, ...shuffledEligible.slice(0, eligibleTarget), ...shuffledOthers.slice(0, othersTarget)];

  // completa com o que sobrar de qualquer um dos dois grupos, se um deles não tiver o suficiente
  if (picked.length < count) {
    const usedIds = new Set(picked.map((p) => p.id));
    const rest = [...shuffledEligible, ...shuffledOthers].filter((p) => !usedIds.has(p.id));
    picked.push(...rest.slice(0, count - picked.length));
  }

  const result = shuffle(picked).slice(0, count);

  // garantia final: se por algum motivo nenhum elegível entrou na amostra
  // (não deveria acontecer, mas nunca deixamos passar), força a troca de 1 carta
  if (eligible.length > 0 && !result.some((p) => findBestSlot(p, formation, filledSlotIds))) {
    result[0] = shuffledEligible[0] ?? guaranteed[0];
  }

  return result;
}

export async function initDraft(roomId: string, humanParticipants: RoomParticipant[]): Promise<DraftState> {
  await delay(600);
  draftFillerNameGuard = createFillerNameGuard(); // reseta a cada nova liga — nunca herda nomes de um draft anterior
  const order = humanParticipants.map((p) => p.id);
  const turns = buildTurnSequence(order);
  let pool = shuffle(buildLeaguePlayerPool());
  const filledSlots: Record<string, Record<string, Player>> = {};
  const participantTactics: Record<string, TeamTactics> = {};
  humanParticipants.forEach((p) => {
    filledSlots[p.id] = {};
    participantTactics[p.id] = p.tactics;
  });

  const firstTurn = turns[0] as DraftTurn | undefined;
  const firstFormation = firstTurn ? participantTactics[firstTurn.participantId].formation : undefined;
  if (firstFormation) pool = ensurePoolHasEligiblePlayer(pool, firstFormation, new Set());

  return {
    roomId,
    order,
    participantTactics,
    turns,
    currentTurnIndex: 0,
    pool,
    candidates: firstFormation ? drawSmartCandidates(pool, firstFormation, new Set(), DRAFT_CONFIG.CANDIDATES_PER_ROUND) : [],
    picks: [],
    filledSlots,
    timerSeconds: DRAFT_CONFIG.PICK_TIMER_SECONDS,
    isComplete: turns.length === 0,
  };
}

export function getCurrentTurn(state: DraftState): DraftTurn | null {
  return state.turns[state.currentTurnIndex] ?? null;
}

/** Retorna as cartas de candidatos já com compatibilidade calculada para a tática de quem está escolhendo. */
export function getCandidateCards(state: DraftState) {
  const turn = getCurrentTurn(state);
  if (!turn) return [];
  const tactics = state.participantTactics[turn.participantId];
  return state.candidates.map((p) => toDraftPlayerCard(p, tactics));
}

/** Um candidato só pode ser escolhido se existir slot vago (posição primária ou secundária) na formação do participante. */
export function isCandidateEligible(state: DraftState, participantId: string, player: Player): boolean {
  const formation = state.participantTactics[participantId].formation;
  const filledSlotIds = new Set(Object.keys(state.filledSlots[participantId] ?? {}));
  return findBestSlot(player, formation, filledSlotIds) !== null;
}

/** Avança o estado para a próxima rodada, aplicando as picks já resolvidas (manual ou automática). */
function advance(state: DraftState, turn: DraftTurn, entries: { playerId: string; isAutoPick: boolean }[]): { state: DraftState; error?: string } {
  const formation = state.participantTactics[turn.participantId].formation;
  const filledSlotIds = new Set(Object.keys(state.filledSlots[turn.participantId] ?? {}));
  const newPicks: DraftPick[] = [];

  for (const { playerId, isAutoPick } of entries) {
    const player = state.pool.find((p) => p.id === playerId);
    if (!player) return { state, error: "Jogador indisponível." };
    const slot = findBestSlot(player, formation, filledSlotIds);
    if (!slot) return { state, error: `${player.name} não tem posição livre nessa formação.` };
    filledSlotIds.add(slot.id);
    newPicks.push({ turnIndex: turn.index, slotId: slot.id, participantId: turn.participantId, player, isAutoPick });
  }

  const pickedIds = new Set(newPicks.map((p) => p.player.id));
  const remainingPool = state.pool.filter((p) => !pickedIds.has(p.id));
  const nextTurnIndex = state.currentTurnIndex + 1;
  const nextTurn = state.turns[nextTurnIndex] as DraftTurn | undefined;
  const isComplete = !nextTurn;

  const participantFilled = { ...(state.filledSlots[turn.participantId] ?? {}) };
  newPicks.forEach((p) => (participantFilled[p.slotId] = p.player));
  const updatedFilledSlots = { ...state.filledSlots, [turn.participantId]: participantFilled };

  let nextCandidates: Player[] = [];
  let poolForNextTurn = remainingPool;
  if (nextTurn) {
    const nextFormation = state.participantTactics[nextTurn.participantId].formation;
    const nextFilledSlotIds = new Set(Object.keys(updatedFilledSlots[nextTurn.participantId] ?? {}));
    poolForNextTurn = ensurePoolHasEligiblePlayer(remainingPool, nextFormation, nextFilledSlotIds);
    nextCandidates = drawSmartCandidates(poolForNextTurn, nextFormation, nextFilledSlotIds, DRAFT_CONFIG.CANDIDATES_PER_ROUND);
  }

  return {
    state: {
      ...state,
      pool: poolForNextTurn,
      candidates: nextCandidates,
      picks: [...state.picks, ...newPicks],
      filledSlots: updatedFilledSlots,
      currentTurnIndex: nextTurnIndex,
      timerSeconds: DRAFT_CONFIG.PICK_TIMER_SECONDS,
      isComplete,
    },
  };
}

/**
 * Confirma a escolha do usuário (clicou em "Confirmar pick"). `playerIds` deve
 * ter exatamente `turn.requiredPicks` itens, todos elegíveis na formação atual.
 */
export function confirmPick(state: DraftState, playerIds: string[]): { state: DraftState; error?: string } {
  const turn = getCurrentTurn(state);
  if (!turn) return { state };
  const validIds = playerIds.filter((id) => state.candidates.some((c) => c.id === id));
  if (validIds.length !== turn.requiredPicks) return { state, error: "Selecione o número correto de jogadores." };
  return advance(
    state,
    turn,
    validIds.map((playerId) => ({ playerId, isAutoPick: false }))
  );
}

/**
 * Timer zerou. `selectedIds` é o que o usuário já tinha marcado (pode ser vazio
 * ou parcial). As vagas restantes são preenchidas automaticamente pelo candidato
 * elegível de maior Overall entre os oferecidos — sempre determinístico. Se nenhum
 * dos 6 candidatos oferecidos for elegível, busca no restante do pool para nunca
 * travar o draft.
 */
export function resolveTimeout(state: DraftState, selectedIds: string[] = []): { state: DraftState; error?: string } {
  const turn = getCurrentTurn(state);
  if (!turn) return { state };
  const formation = state.participantTactics[turn.participantId].formation;

  const filledSlotIds = new Set(Object.keys(state.filledSlots[turn.participantId] ?? {}));
  const confirmedSelected = selectedIds.filter(
    (id) => state.candidates.some((c) => c.id === id) && isCandidateEligible(state, turn.participantId, state.candidates.find((c) => c.id === id)!)
  );

  confirmedSelected.forEach((id) => {
    const player = state.candidates.find((c) => c.id === id)!;
    const slot = findBestSlot(player, formation, filledSlotIds);
    if (slot) filledSlotIds.add(slot.id);
  });

  const remainingSlotsNeeded = turn.requiredPicks - confirmedSelected.length;
  const autoIds: string[] = [];

  if (remainingSlotsNeeded > 0) {
    const alreadyPicked = new Set([...confirmedSelected]);
    // sempre determinístico: maior Overall bruto primeiro entre os 6 candidatos
    // mostrados, depois --- se ainda faltar vaga, mesmo que os candidatos
    // mostrados "pareçam suficientes em quantidade" mas sejam todos da mesma
    // posição --- continua buscando no restante do pool até preencher de fato
    const shownSorted = state.candidates.filter((c) => !alreadyPicked.has(c.id)).sort((a, b) => b.overall - a.overall);
    const deepPoolSorted = state.pool
      .filter((p) => !state.candidates.some((c) => c.id === p.id))
      .sort((a, b) => b.overall - a.overall);

    for (const candidate of [...shownSorted, ...deepPoolSorted]) {
      if (autoIds.length >= remainingSlotsNeeded) break;
      const slot = findBestSlot(candidate, formation, filledSlotIds);
      if (slot) {
        filledSlotIds.add(slot.id);
        autoIds.push(candidate.id);
      }
    }
  }

  const entries = [
    ...confirmedSelected.map((playerId) => ({ playerId, isAutoPick: false })),
    ...autoIds.map((playerId) => ({ playerId, isAutoPick: true })),
  ];

  return advance(state, turn, entries);
}

export function getSquadForParticipant(state: DraftState, participantId: string): Player[] {
  return state.picks.filter((pick) => pick.participantId === participantId).map((pick) => pick.player);
}

/**
 * Monta as reservas de cada participante humano a partir do pool restante após
 * o fim do draft — respeitando posições (banco cobre goleiro, defesa, meio e
 * ataque). Chamado uma única vez, na tela "Gerando Liga".
 */
export function assignReservesToHumans(
  finalPool: Player[],
  humanParticipantIds: string[],
  clubNames: Record<string, string>,
  usedNames: Set<string> = createFillerNameGuard()
): { reserves: Record<string, Player[]>; remainingPool: Player[] } {
  let pool = shuffle(finalPool);
  const reserves: Record<string, Player[]> = {};

  for (const participantId of humanParticipantIds) {
    const { reserves: teamReserves, remainingPool } = buildReserveSquad(pool, clubNames[participantId] ?? "Reservas", usedNames);
    reserves[participantId] = teamReserves;
    pool = remainingPool;
  }

  return { reserves, remainingPool: pool };
}
