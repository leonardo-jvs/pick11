import { Player } from "@/types/player";
import { Team, TeamTactics } from "@/types/team";
import { Match, MatchEvent, MatchStatLine, StandingRow, TopScorer, TopAssist, BestDefense } from "@/types/match";
import { BOT_CLUB_NAMES } from "@/mocks/clubs";
import { FORMATIONS, LEAGUE_CONFIG, PLAY_STYLES } from "@/constants/game";
import { computeTeamOverall, computeTeamCompatibilityStars } from "@/services/compatibilityService";
import { buildStartersForFormation, buildReserveSquad } from "@/services/squadBuilderService";
import { delay, generateId, randomBetween } from "@/lib/delay";

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function randomTactics(): TeamTactics {
  return {
    formation: FORMATIONS[randomBetween(0, FORMATIONS.length - 1)],
    attackStyle: PLAY_STYLES.attack[randomBetween(0, PLAY_STYLES.attack.length - 1)],
    defenseStyle: PLAY_STYLES.defense[randomBetween(0, PLAY_STYLES.defense.length - 1)],
  };
}

/**
 * Preenche os clubes restantes até completar LEAGUE_CONFIG.TOTAL_CLUBS.
 * Usa primeiro os jogadores que sobraram do draft; quando esgota, gera jogadores fictícios.
 * Roda em background — sem tela de espera própria (acontece durante "Gerando Liga").
 */
export async function generateBotSquads(remainingPool: Player[], humanTeamsCount: number): Promise<Team[]> {
  await delay(200);

  const botCount = Math.max(0, LEAGUE_CONFIG.TOTAL_CLUBS - humanTeamsCount);
  const usedNames = new Set<string>();
  if (botCount === 0) return [];

  // Embaralha o pool restante — cada bot pega o melhor disponível por posição
  // (respeitando a formação sorteada), na ordem em que os clubes são criados.
  let pool = shuffle(remainingPool);
  const bots: Team[] = [];

  for (let i = 0; i < botCount; i++) {
    const clubName = BOT_CLUB_NAMES[i % BOT_CLUB_NAMES.length];
    const tactics = randomTactics();

    const { starters, remainingPool: poolAfterStarters } = buildStartersForFormation(pool, tactics.formation, clubName, usedNames);
    const { reserves, remainingPool: poolAfterReserves } = buildReserveSquad(poolAfterStarters, clubName, usedNames);
    pool = poolAfterReserves;

    const squad = [...starters, ...reserves];

    bots.push({
      id: generateId("bot"),
      ownerId: `bot_${i}`,
      ownerName: "IA",
      clubName,
      isHuman: false,
      tactics,
      starters,
      reserves,
      squad,
      overall: computeTeamOverall(squad, tactics),
      compatibilityStars: computeTeamCompatibilityStars(squad, tactics),
      physical: randomBetween(80, 96),
    });
  }
  return bots;
}

/** Gera o calendário completo (turno + returno) via método do círculo — sempre N-1 rodadas por turno */
export function generateSchedule(teamIds: string[]): { round: number; homeId: string; awayId: string }[] {
  const ids = [...teamIds];
  if (ids.length % 2 !== 0) ids.push("BYE");
  const n = ids.length;
  const half = n / 2;
  const rounds = n - 1;
  const fixtures: { round: number; homeId: string; awayId: string }[] = [];

  const arr = [...ids];
  for (let r = 0; r < rounds; r++) {
    for (let i = 0; i < half; i++) {
      const home = arr[i];
      const away = arr[n - 1 - i];
      if (home === "BYE" || away === "BYE") continue;
      const swapped = r % 2 === 1;
      fixtures.push({
        round: r + 1,
        homeId: swapped ? away : home,
        awayId: swapped ? home : away,
      });
    }
    // rotaciona mantendo o primeiro fixo
    arr.splice(1, 0, arr.pop()!);
  }

  // returno: espelha com mando de campo invertido
  const secondLeg = fixtures.map((f) => ({
    round: f.round + rounds,
    homeId: f.awayId,
    awayId: f.homeId,
  }));

  return [...fixtures, ...secondLeg];
}

const ATTACKING_POSITIONS = ["ATA", "MEI"];

function pickWeighted<T>(items: T[]): T {
  return items[randomBetween(0, items.length - 1)];
}

function simulateGoalsForTeam(overall: number, opponentOverall: number): number {
  const diff = overall - opponentOverall;
  const base = 1 + diff / 18; // times mais fortes tendem a marcar mais
  const chance = Math.max(0.2, Math.min(3.2, base + (Math.random() - 0.5) * 2));
  return Math.max(0, Math.round(chance));
}

function buildEvents(homeTeam: Team, awayTeam: Team, homeGoals: number, awayGoals: number): MatchEvent[] {
  const events: MatchEvent[] = [];
  const homeAttackers = homeTeam.squad.filter((p) => ATTACKING_POSITIONS.includes(p.position));
  const awayAttackers = awayTeam.squad.filter((p) => ATTACKING_POSITIONS.includes(p.position));

  const addGoals = (count: number, team: "home" | "away") => {
    const attackers = team === "home" ? homeAttackers : awayAttackers;
    const squad = team === "home" ? homeTeam.squad : awayTeam.squad;
    const scorers = attackers.length > 0 ? attackers : squad;
    for (let i = 0; i < count; i++) {
      const scorer = pickWeighted(scorers);
      const possibleAssists = squad.filter((p) => p.id !== scorer.id);
      const assist = Math.random() > 0.35 && possibleAssists.length > 0 ? pickWeighted(possibleAssists) : undefined;
      events.push({
        id: generateId("evt"),
        minute: randomBetween(3, 90),
        type: "goal",
        team,
        playerName: scorer.name,
        secondaryPlayerName: assist?.name,
      });
    }
  };

  addGoals(homeGoals, "home");
  addGoals(awayGoals, "away");

  const cardCount = randomBetween(0, 4);
  for (let i = 0; i < cardCount; i++) {
    const team: "home" | "away" = Math.random() > 0.5 ? "home" : "away";
    const squad = team === "home" ? homeTeam.squad : awayTeam.squad;
    const player = pickWeighted(squad);
    events.push({
      id: generateId("evt"),
      minute: randomBetween(10, 88),
      type: Math.random() > 0.92 ? "red_card" : "yellow_card",
      team,
      playerName: player.name,
    });
  }

  return events.sort((a, b) => a.minute - b.minute);
}

function buildStatLine(homeGoals: number, awayGoals: number): MatchStatLine {
  const possession = randomBetween(38, 62);
  const shotsHome = randomBetween(homeGoals + 2, homeGoals + 14);
  const shotsAway = randomBetween(awayGoals + 2, awayGoals + 14);
  return {
    possession,
    shots: [shotsHome, shotsAway],
    shotsOnTarget: [Math.min(shotsHome, homeGoals + randomBetween(1, 5)), Math.min(shotsAway, awayGoals + randomBetween(1, 5))],
    fouls: [randomBetween(4, 16), randomBetween(4, 16)],
    corners: [randomBetween(1, 9), randomBetween(1, 9)],
  };
}

export function simulateMatch(round: number, homeTeam: Team, awayTeam: Team, isUserMatch: boolean): Match {
  const homeGoals = simulateGoalsForTeam(homeTeam.overall, awayTeam.overall);
  const awayGoals = simulateGoalsForTeam(awayTeam.overall, homeTeam.overall);
  const events = buildEvents(homeTeam, awayTeam, homeGoals, awayGoals);
  const stats = buildStatLine(homeGoals, awayGoals);

  const scorers = events.filter((e) => e.type === "goal");
  const motmPool = scorers.length > 0 ? scorers.map((e) => e.playerName) : [...homeTeam.squad, ...awayTeam.squad].map((p) => p.name);

  return {
    id: generateId("match"),
    round,
    homeTeamId: homeTeam.id,
    awayTeamId: awayTeam.id,
    homeTeamName: homeTeam.clubName,
    awayTeamName: awayTeam.clubName,
    homeScore: homeGoals,
    awayScore: awayGoals,
    events,
    stats,
    manOfTheMatch: pickWeighted(motmPool),
    isUserMatch,
  };
}

export function computeStandings(teams: Team[], matches: Match[], userTeamId: string): StandingRow[] {
  const table = new Map<string, StandingRow>();
  teams.forEach((t) => {
    table.set(t.id, {
      teamId: t.id,
      teamName: t.clubName,
      isUserTeam: t.id === userTeamId,
      played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      points: 0,
    });
  });

  matches.forEach((m) => {
    const home = table.get(m.homeTeamId);
    const away = table.get(m.awayTeamId);
    if (!home || !away) return;

    home.played++;
    away.played++;
    home.goalsFor += m.homeScore;
    home.goalsAgainst += m.awayScore;
    away.goalsFor += m.awayScore;
    away.goalsAgainst += m.homeScore;

    if (m.homeScore > m.awayScore) {
      home.wins++;
      home.points += 3;
      away.losses++;
    } else if (m.homeScore < m.awayScore) {
      away.wins++;
      away.points += 3;
      home.losses++;
    } else {
      home.draws++;
      away.draws++;
      home.points++;
      away.points++;
    }
  });

  return Array.from(table.values()).sort(
    (a, b) => b.points - a.points || b.goalsFor - b.goalsAgainst - (a.goalsFor - a.goalsAgainst) || b.goalsFor - a.goalsFor
  );
}

export function computeTopScorers(matches: Match[], limit = 10): TopScorer[] {
  const map = new Map<string, { team: string; goals: number }>();
  matches.forEach((m) => {
    m.events
      .filter((e) => e.type === "goal")
      .forEach((e) => {
        const teamName = e.team === "home" ? m.homeTeamName : m.awayTeamName;
        const entry = map.get(e.playerName) ?? { team: teamName, goals: 0 };
        entry.goals++;
        map.set(e.playerName, entry);
      });
  });
  return Array.from(map.entries())
    .map(([playerName, v]) => ({ playerName, teamName: v.team, goals: v.goals }))
    .sort((a, b) => b.goals - a.goals)
    .slice(0, limit);
}

export function computeTopAssists(matches: Match[], limit = 10): TopAssist[] {
  const map = new Map<string, { team: string; assists: number }>();
  matches.forEach((m) => {
    m.events
      .filter((e) => e.type === "goal" && e.secondaryPlayerName)
      .forEach((e) => {
        const teamName = e.team === "home" ? m.homeTeamName : m.awayTeamName;
        const entry = map.get(e.secondaryPlayerName!) ?? { team: teamName, assists: 0 };
        entry.assists++;
        map.set(e.secondaryPlayerName!, entry);
      });
  });
  return Array.from(map.entries())
    .map(([playerName, v]) => ({ playerName, teamName: v.team, assists: v.assists }))
    .sort((a, b) => b.assists - a.assists)
    .slice(0, limit);
}

export function computeBestDefenses(standings: StandingRow[], limit = 10): BestDefense[] {
  return [...standings]
    .sort((a, b) => a.goalsAgainst - b.goalsAgainst)
    .slice(0, limit)
    .map((s) => ({ teamName: s.teamName, goalsConceded: s.goalsAgainst }));
}
