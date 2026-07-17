import { Team } from "@/types/team";
import { Match, StandingRow } from "@/types/match";
import { CupGroup, CupGroupFixture, CupKnockoutMatch, CupPhase, CupState } from "@/types/cup";
import { computeStandings } from "@/services/leagueService";
import { generateId, randomBetween } from "@/lib/delay";

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
export function buildInitialBracket(seededTeamIds: string[], firstPhase: CupTier["firstKnockoutPhase"]): CupKnockoutMatch[] {
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

/**
 * Disputa de pênaltis simplificada: chance ponderada pelo Overall de cada
 * time, resultado sempre com um placar plausível de pênaltis (nunca empate).
 */
export function resolvePenalties(homeTeam: Team, awayTeam: Team): { homeGoals: number; awayGoals: number; winnerId: string } {
  const diff = homeTeam.overall - awayTeam.overall;
  const homeWinChance = Math.max(0.3, Math.min(0.7, 0.5 + diff / 100));
  const homeWins = Math.random() < homeWinChance;

  const winnerGoals = randomBetween(3, 5);
  const loserGoals = randomBetween(0, winnerGoals - 1);

  return {
    homeGoals: homeWins ? winnerGoals : loserGoals,
    awayGoals: homeWins ? loserGoals : winnerGoals,
    winnerId: homeWins ? homeTeam.id : awayTeam.id,
  };
}

const PHASE_LABELS: Record<Exclude<CupPhase, "groups" | "finished">, string> = {
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
