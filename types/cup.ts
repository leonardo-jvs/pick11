export type CupPhase = "groups" | "quarterfinal" | "semifinal" | "final" | "finished";

export interface CupGroup {
  id: string;
  name: string; // "Grupo A", "Grupo B"...
  teamIds: string[]; // sempre 4
}

export interface CupGroupFixture {
  round: number; // 1, 2 ou 3 — turno único dentro do grupo
  groupId: string;
  homeId: string;
  awayId: string;
}

export interface CupKnockoutMatch {
  id: string;
  phase: Exclude<CupPhase, "groups" | "finished">;
  slot: number; // posição no chaveamento daquela fase (0-based)
  homeId: string | null; // null até a fase anterior definir o classificado
  awayId: string | null;
  matchId?: string; // referência ao Match (types/match) já simulado
  winnerId?: string;
  wentToPenalties?: boolean;
  penaltyScore?: [number, number];
}

export interface CupState {
  totalTeams: number;
  groupCount: number;
  groups: CupGroup[];
  groupFixtures: CupGroupFixture[];
  currentGroupRound: number; // 1..3
  phase: CupPhase;
  knockout: CupKnockoutMatch[];
}
