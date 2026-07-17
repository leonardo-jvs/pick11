export const ROUTES = {
  splash: "/",
  menu: "/menu",
  howToPlay: "/how-to-play",

  roomHub: "/room",
  roomCreate: "/room/create",
  roomJoin: "/room/join",

  lobby: (roomId: string) => `/lobby/${roomId}`,
  draft: (roomId: string) => `/draft/${roomId}`,
  team: (roomId: string) => `/team/${roomId}`,
  generatingLeague: (roomId: string) => `/generating-league/${roomId}`,
  preMatch: (roomId: string, round: number) => `/pre-match/${roomId}?round=${round}`,
  tacticalAdjustment: (roomId: string) => `/tactical-adjustment/${roomId}`,
  simulation: (roomId: string, round: number) => `/simulation/${roomId}?round=${round}`,
  result: (roomId: string, round: number) => `/result/${roomId}?round=${round}`,
  standings: (roomId: string) => `/standings/${roomId}`,
  stats: (roomId: string) => `/stats/${roomId}`,
  leagueFinal: (roomId: string) => `/league-final/${roomId}`,
  cupBracket: (roomId: string) => `/cup-bracket/${roomId}`,
  cupFinal: (roomId: string) => `/cup-final/${roomId}`,
} as const;
