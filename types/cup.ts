export type CupPhase = "groups" | "relegation" | "quarterfinal" | "semifinal" | "final" | "finished";

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

/** Uma cobrança individual de uma disputa de pênaltis. */
export interface PenaltyKick {
  teamId: string;
  playerName: string;
  result: "goal" | "miss" | "save" | "post";
  kickNumber: number; // ordem geral da disputa (1, 2, 3...), alternando entre os times
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
  /** Cobrança a cobrança, na ordem exata em que aconteceram — permite que
   * todo mundo assista à mesma disputa de pênaltis, sincronizada. */
  penaltyKicks?: PenaltyKick[];
}

export interface CupState {
  totalTeams: number;
  groupCount: number;
  groups: CupGroup[];
  groupFixtures: CupGroupFixture[];
  currentGroupRound: number; // 1..3
  phase: CupPhase;
  knockout: CupKnockoutMatch[];
  /**
   * Só usado pelo modo "Liga + Mata-Mata": a ordem exata das partidas
   * decisivas (rebaixamento, semifinais, final) que TODOS os participantes
   * da sala acompanham juntos, uma de cada vez — nunca preenchido pela Copa,
   * que continua resolvendo cada fase do jeito que sempre resolveu.
   */
  decisiveOrder?: string[]; // ids de CupKnockoutMatch, na ordem de exibição
  currentDecisiveIndex?: number; // qual item de decisiveOrder está "ao vivo" agora
}
