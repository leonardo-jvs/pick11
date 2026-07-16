export type Position = "GOL" | "ZAG" | "LAT" | "VOL" | "MEI" | "ATA";

/** Únicas duas características oficiais de um jogador no Pick11. */
export type AttackStyle = "Posse" | "Contra-ataque" | "Cruzamentos";
export type DefenseStyle = "Pressão alta" | "Bloco médio" | "Linha baixa";

export interface Player {
  id: string;
  name: string;
  club: string;
  position: Position;
  /** Posições alternativas em que o jogador também pode atuar (ex: Neymar: ATA + MEI) */
  secondaryPositions?: Position[];
  overall: number; // 40–99, nunca exibir o cálculo, só o número final
  attackStyle: AttackStyle;
  defenseStyle: DefenseStyle;
  physical: number; // 0–100, decai ao longo da liga
}

/**
 * Card de jogador com compatibilidade calculada em relação ao estilo do time
 * que está draftando. Nunca é um dado fixo do mock — é derivado em runtime por
 * services/compatibilityService, e nunca expõe o cálculo, só o resultado final
 * (estrelas + overall final com delta).
 */
export interface DraftPlayerCard extends Player {
  compatibilityStars: 1 | 2 | 3;
  compatibilityDelta: number; // ex: +2, +1, 0
  overallFinal: number; // overall + compatibilityDelta
}
