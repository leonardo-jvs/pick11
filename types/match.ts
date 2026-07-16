export type MatchEventType = "goal" | "yellow_card" | "red_card" | "substitution" | "half_time" | "full_time";

export interface MatchEvent {
  id: string;
  minute: number;
  type: MatchEventType;
  team: "home" | "away";
  playerName: string;
  secondaryPlayerName?: string; // ex: assistência, jogador substituído
}

export interface MatchStatLine {
  possession: number; // home %, away = 100 - home
  shots: [number, number];
  shotsOnTarget: [number, number];
  fouls: [number, number];
  corners: [number, number];
}

export interface Match {
  id: string;
  round: number;
  homeTeamId: string;
  awayTeamId: string;
  homeTeamName: string;
  awayTeamName: string;
  homeScore: number;
  awayScore: number;
  events: MatchEvent[];
  stats: MatchStatLine;
  manOfTheMatch: string;
  isUserMatch: boolean;
}

export interface StandingRow {
  teamId: string;
  teamName: string;
  isUserTeam: boolean;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
}

export interface TopScorer {
  playerName: string;
  teamName: string;
  goals: number;
}

export interface TopAssist {
  playerName: string;
  teamName: string;
  assists: number;
}

export interface BestDefense {
  teamName: string;
  goalsConceded: number;
}
