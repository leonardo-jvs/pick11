import { Team } from "@/types/team";
import { Player } from "@/types/player";
import { Match, StandingRow } from "@/types/match";
import { CupGroup, CupGroupFixture, CupKnockoutMatch, CupPhase, CupState, PenaltyKick } from "@/types/cup";
import { computeStandings } from "@/services/leagueService";
import { generateId } from "@/lib/delay";

/**
 * Formato adaptativo da Copa, conforme a quantidade de participantes humanos
 * na sala. O total de equipes é sempre completado com bots até o próximo
 * "degrau" suportado (8, 12, 16 ou 20) — nunca passa de 20.
 */
export interface CupTier {
  totalTeams: number;
  groupCount: number;
  /** quantos classificam de cada grupo direto (o resto vem dos melhores 2º/3º colocados) */
  directQualifiersPerGroup: number;
  /** quantos "melhores colocados de fora" completam a vaga (ex: melhores 2º colocados) */
  bestRunnersUp: number;
  firstKnockoutPhase: Extract<CupPhase, "quarterfinal" | "semifinal">;
}

export function determineCupTier(humanCount: number): CupTier {
  const n = Math.max(2, Math.min(20, humanCount));
  if (n <= 8) return { totalTeams: 8, groupCount: 2, directQualifiersPerGroup: 2, bestRunnersUp: 0, firstKnockoutPhase: "semifinal" };
  if (n <= 12) return { totalTeams: 12, groupCount: 3, directQualifiersPerGroup: 1, bestRunnersUp: 1, firstKnockoutPhase: "semifinal" };
  if (n <= 16) return { totalTeams: 16, groupCount: 4, directQualifiersPerGroup: 2, bestRunnersUp: 0, firstKnockoutPhase: "quarterfinal" };
  return { totalTeams: 20, groupCount: 5, directQualifiersPerGroup: 1, bestRunnersUp: 3, firstKnockoutPhase: "quarterfinal" };
}

const GROUP_LETTERS = ["A", "B", "C", "D", "E"];

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** Divide as equipes em grupos de exatamente 4, embaralhados. */
export function generateGroups(teamIds: string[], groupCount: number): CupGroup[] {
  const shuffled = shuffle(teamIds);
  return Array.from({ length: groupCount }, (_, i) => ({
    id: `group-${i}`,
    name: `Grupo ${GROUP_LETTERS[i]}`,
    teamIds: shuffled.slice(i * 4, i * 4 + 4),
  }));
}

/** Turno único dentro de cada grupo de 4 (3 rodadas, todos contra todos uma vez). */
export function generateGroupFixtures(groups: CupGroup[]): CupGroupFixture[] {
  const fixtures: CupGroupFixture[] = [];
  const pattern: [number, number][][] = [
    [[0, 3], [1, 2]],
    [[0, 2], [3, 1]],
    [[0, 1], [2, 3]],
  ];
  for (const group of groups) {
    pattern.forEach((roundPairs, roundIdx) => {
      roundPairs.forEach(([a, b]) => {
        fixtures.push({ round: roundIdx + 1, groupId: group.id, homeId: group.teamIds[a], awayId: group.teamIds[b] });
      });
    });
  }
  return fixtures;
}

/** Classificação de um grupo específico — mesmos critérios da Liga (pontos, saldo, gols marcados). */
export function computeGroupStandings(group: CupGroup, teams: Team[], matches: Match[]): StandingRow[] {
  const groupTeams = teams.filter((t) => group.teamIds.includes(t.id));
  const groupMatches = matches.filter((m) => group.teamIds.includes(m.homeTeamId) && group.teamIds.includes(m.awayTeamId));
  return computeStandings(groupTeams, groupMatches, "");
}

/**
 * Define quem se classifica pro mata-mata, na ordem certa pra seedar o
 * chaveamento (times mais bem colocados protegidos de se enfrentar cedo).
 */
export function getQualifiedTeamIds(groups: CupGroup[], teams: Team[], matches: Match[], tier: CupTier): string[] {
  const standingsByGroup = groups.map((g) => computeGroupStandings(g, teams, matches));

  const leaders = standingsByGroup.map((s) => s[0]).filter(Boolean);
  const runnersUp = tier.directQualifiersPerGroup >= 2 ? standingsByGroup.map((s) => s[1]).filter(Boolean) : [];

  let qualifiers = [...leaders, ...runnersUp];

  if (tier.bestRunnersUp > 0) {
    const candidateRunnersUp = standingsByGroup.map((s) => s[1]).filter(Boolean);
    const bestOfTheRest = [...candidateRunnersUp]
      .sort((a, b) => b.points - a.points || b.goalsFor - b.goalsAgainst - (a.goalsFor - a.goalsAgainst) || b.goalsFor - a.goalsFor)
      .slice(0, tier.bestRunnersUp);
    qualifiers = [...leaders, ...bestOfTheRest];
  }

  // Seed: melhor colocado primeiro (por pontos/saldo/gols) — usado pra montar o chaveamento protegendo os favoritos
  qualifiers.sort((a, b) => b.points - a.points || b.goalsFor - b.goalsAgainst - (a.goalsFor - a.goalsAgainst) || b.goalsFor - a.goalsFor);

  return qualifiers.map((s) => s.teamId);
}

/** Monta a primeira fase do mata-mata com seed padrão de chaveamento (1ºxÚltimo, protegendo os favoritos). */
export function buildInitialBracket(seededTeamIds: string[], firstPhase: Exclude<CupPhase, "groups" | "finished">): CupKnockoutMatch[] {
  const n = seededTeamIds.length;
  const matches: CupKnockoutMatch[] = [];
  for (let i = 0; i < n / 2; i++) {
    matches.push({
      id: generateId("ko"),
      phase: firstPhase,
      slot: i,
      homeId: seededTeamIds[i],
      awayId: seededTeamIds[n - 1 - i],
    });
  }
  return matches;
}

const NEXT_PHASE: Partial<Record<CupPhase, CupPhase>> = {
  quarterfinal: "semifinal",
  semifinal: "final",
};

/** Depois que todas as partidas de uma fase têm vencedor, gera a fase seguinte automaticamente. */
export function advancePhaseIfComplete(knockout: CupKnockoutMatch[], phase: Exclude<CupPhase, "groups" | "finished">): {
  knockout: CupKnockoutMatch[];
  nextPhase: CupPhase;
} {
  const phaseMatches = knockout.filter((m) => m.phase === phase);
  const allDecided = phaseMatches.every((m) => m.winnerId);
  if (!allDecided) return { knockout, nextPhase: phase };

  const next = NEXT_PHASE[phase];
  if (!next) return { knockout, nextPhase: "finished" };

  const winners = phaseMatches.sort((a, b) => a.slot - b.slot).map((m) => m.winnerId!);
  const nextMatches: CupKnockoutMatch[] = [];
  for (let i = 0; i < winners.length / 2; i++) {
    nextMatches.push({
      id: generateId("ko"),
      phase: next as Exclude<CupPhase, "groups" | "finished">,
      slot: i,
      homeId: winners[i * 2],
      awayId: winners[i * 2 + 1],
    });
  }

  return { knockout: [...knockout, ...nextMatches], nextPhase: next };
}

export interface PenaltyShootoutResult {
  kicks: PenaltyKick[];
  homeGoals: number;
  awayGoals: number;
  winnerId: string;
}

/**
 * Escolhe o próximo cobrador entre os titulares de linha (nunca o goleiro).
 * Prioriza fortemente quem tem maior Overall (proxy de qualidade
 * ofensiva/finalização, já que o jogo não modela um atributo separado pra
 * isso), com um bônus extra pra atacantes e meias — mas não é sempre
 * literalmente o melhor: o sorteio é ponderado, então dá variedade real
 * entre disputas. Nunca repete um jogador antes que todos os de linha já
 * tenham cobrado pelo menos uma vez; depois disso, repetição é permitida
 * normalmente (igual ao futebol de verdade).
 */
function pickPenaltyKicker(team: Team, alreadyKicked: Set<string>): Player {
  const eligible = team.starters.filter((p) => p.position !== "GOL");
  const pool = eligible.length === 0 ? team.starters : eligible;
  const notYetKicked = pool.filter((p) => !alreadyKicked.has(p.id));
  const candidates = notYetKicked.length > 0 ? notYetKicked : pool;

  const weighted = candidates
    .map((p) => ({ player: p, weight: p.overall + (p.position === "ATA" ? 8 : p.position === "MEI" ? 4 : 0) }))
    .sort((a, b) => b.weight - a.weight);

  // Sorteio ponderado pro topo da lista (Math.random()^2 concentra nos
  // primeiros índices, mas ainda dá chance real pros demais) — não é
  // sempre literalmente o "melhor" jogador, como no futebol de verdade.
  const idx = Math.min(weighted.length - 1, Math.floor(Math.random() * Math.random() * weighted.length));
  return weighted[idx].player;
}

/** Resultado de UMA cobrança — probabilidade ajustada pela qualidade do batedor vs. do goleiro adversário. */
function simulateSingleKick(kicker: Player, goalkeeper: Player | undefined): PenaltyKick["result"] {
  const gkSkill = goalkeeper?.overall ?? 78;
  const baseGoalChance = 0.76; // conversão típica de pênaltis no futebol profissional
  const adjust = (kicker.overall - gkSkill) / 500;
  const goalChance = Math.max(0.55, Math.min(0.92, baseGoalChance + adjust));

  if (Math.random() < goalChance) return "goal";
  const missRoll = Math.random();
  if (missRoll < 0.5) return "save"; // goleiro defendeu
  if (missRoll < 0.75) return "post"; // na trave
  return "miss"; // pra fora
}

/**
 * Disputa de pênaltis completa, seguindo as regras oficiais: 5 cobranças por
 * equipe alternadas (casa primeiro), encerramento antecipado assim que um
 * lado se torna matematicamente irretomável, e morte súbita (uma cobrança
 * cada, decide na primeira diferença) se seguir empatado após as 5 de cada.
 * O goleiro titular nunca é substituído. Retorna cada cobrança em ordem,
 * pra toda a sala poder assistir à mesma disputa, sincronizada.
 *
 * Única implementação de pênaltis do jogo — reutilizada pela Copa, pela
 * disputa contra o rebaixamento e pelas semifinais/final do Liga + Mata-Mata.
 */
export function simulatePenaltyShootout(homeTeam: Team, awayTeam: Team): PenaltyShootoutResult {
  const kicks: PenaltyKick[] = [];
  const homeKicked = new Set<string>();
  const awayKicked = new Set<string>();
  const homeGK = homeTeam.starters.find((p) => p.position === "GOL");
  const awayGK = awayTeam.starters.find((p) => p.position === "GOL");

  let homeGoals = 0;
  let awayGoals = 0;
  let homeTaken = 0;
  let awayTaken = 0;
  let kickNumber = 0;
  let isHomeTurn = true;

  // Fase regular: até 5 cobranças por equipe, casa sempre bate primeiro em
  // cada rodada. Verifica encerramento antecipado depois de CADA cobrança.
  while (homeTaken < 5 || awayTaken < 5) {
    const isHome: boolean = isHomeTurn;
    if (isHome && homeTaken >= 5) {
      isHomeTurn = false;
      continue;
    }
    if (!isHome && awayTaken >= 5) {
      isHomeTurn = true;
      continue;
    }

    const team = isHome ? homeTeam : awayTeam;
    const kickedSet = isHome ? homeKicked : awayKicked;
    const opponentGK = isHome ? awayGK : homeGK;

    const kicker = pickPenaltyKicker(team, kickedSet);
    kickedSet.add(kicker.id);
    const result = simulateSingleKick(kicker, opponentGK);
    if (result === "goal") {
      if (isHome) homeGoals++;
      else awayGoals++;
    }
    if (isHome) homeTaken++;
    else awayTaken++;
    kickNumber++;
    kicks.push({ teamId: team.id, playerName: kicker.name, result, kickNumber });

    const homeRemaining = 5 - homeTaken;
    const awayRemaining = 5 - awayTaken;
    if (homeGoals > awayGoals + awayRemaining) break; // casa já não pode ser alcançada
    if (awayGoals > homeGoals + homeRemaining) break; // visitante já não pode ser alcançado

    isHomeTurn = !isHome;
  }

  // Morte súbita: uma cobrança pra cada lado, decide assim que alguém errar
  // e o outro marcar. Continua indefinidamente até haver um vencedor.
  while (homeGoals === awayGoals) {
    const homeKicker = pickPenaltyKicker(homeTeam, homeKicked);
    homeKicked.add(homeKicker.id);
    const homeResult = simulateSingleKick(homeKicker, awayGK);
    if (homeResult === "goal") homeGoals++;
    kickNumber++;
    kicks.push({ teamId: homeTeam.id, playerName: homeKicker.name, result: homeResult, kickNumber });

    const awayKicker = pickPenaltyKicker(awayTeam, awayKicked);
    awayKicked.add(awayKicker.id);
    const awayResult = simulateSingleKick(awayKicker, homeGK);
    if (awayResult === "goal") awayGoals++;
    kickNumber++;
    kicks.push({ teamId: awayTeam.id, playerName: awayKicker.name, result: awayResult, kickNumber });
  }

  return { kicks, homeGoals, awayGoals, winnerId: homeGoals > awayGoals ? homeTeam.id : awayTeam.id };
}

const PHASE_LABELS: Record<Exclude<CupPhase, "groups" | "finished">, string> = {
  relegation: "Disputa contra o Rebaixamento",
  quarterfinal: "Quartas de Final",
  semifinal: "Semifinal",
  final: "Final",
};

export function getPhaseLabel(phase: CupPhase): string {
  if (phase === "groups") return "Fase de Grupos";
  if (phase === "finished") return "Encerrada";
  return PHASE_LABELS[phase];
}

/** Monta o CupState inicial completo — chamado uma única vez, na tela "Gerando Liga". */
export function initCupState(teamIds: string[], humanCount: number): CupState {
  const tier = determineCupTier(humanCount);
  const selected = shuffle(teamIds).slice(0, tier.totalTeams);
  const groups = generateGroups(selected, tier.groupCount);
  const groupFixtures = generateGroupFixtures(groups);

  return {
    totalTeams: tier.totalTeams,
    groupCount: tier.groupCount,
    groups,
    groupFixtures,
    currentGroupRound: 1,
    phase: "groups",
    knockout: [],
  };
}

/** Encontra o próximo confronto do time (grupo ou mata-mata), pra Pré-Partida e Simulação. */
export function getCurrentFixtureForTeam(
  cup: CupState,
  teamId: string
): { opponentId: string; isHome: boolean; context: string } | null {
  if (cup.phase === "groups") {
    const fixture = cup.groupFixtures.find(
      (f) => f.round === cup.currentGroupRound && (f.homeId === teamId || f.awayId === teamId)
    );
    if (!fixture) return null;
    const group = cup.groups.find((g) => g.id === fixture.groupId)!;
    return {
      opponentId: fixture.homeId === teamId ? fixture.awayId : fixture.homeId,
      isHome: fixture.homeId === teamId,
      context: `${group.name} · Rodada ${cup.currentGroupRound}/3`,
    };
  }

  if (cup.phase === "finished") return null;

  const match = cup.knockout.find((m) => m.phase === cup.phase && !m.winnerId && (m.homeId === teamId || m.awayId === teamId));
  if (!match || !match.homeId || !match.awayId) return null;
  return {
    opponentId: match.homeId === teamId ? match.awayId : match.homeId,
    isHome: match.homeId === teamId,
    context: getPhaseLabel(cup.phase),
  };
}
