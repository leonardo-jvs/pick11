export type Position = "GOL" | "ZAG" | "LAT" | "VOL" | "MEI" | "ATA";

/** Únicas duas características oficiais de um jogador no Pick11. */
export type AttackStyle = "Posse" | "Contra-ataque" | "Cruzamentos";
export type DefenseStyle = "Pressão alta" | "Bloco médio" | "Linha baixa";

/**
 * common = jogador atual do Brasileirão (carta padrão).
 * prime = "Auge" — versão histórica de uma temporada marcante.
 * legend = "Lendária" — ídolo histórico do futebol brasileiro.
 * proclubs = "Pro Clubs" — jogador fictício inspirado no modo Pro Clubs, carta muito rara.
 * Ausente = tratado como "common" (retrocompatível com dados antigos/fictícios).
 */
export type PlayerCategory = "common" | "prime" | "legend" | "proclubs";

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
  category?: PlayerCategory;
  /** Só relevante para cartas "prime" (temporada retratada, ex: "2019") */
  season?: string;
  /**
   * Identidade estável do atleta real, compartilhada entre todas as cartas
   * dele (comum/Auge/Lendária). Ex: "arrascaeta" liga "Arrascaeta" (comum,
   * Flamengo atual) e "Arrascaeta" (Auge, Flamengo 2022) — só uma das duas
   * pode entrar na pool de uma mesma liga. Se omitido, o nome normalizado é
   * usado como chave (suficiente quando o atleta só tem uma carta).
   */
  athleteKey?: string;
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
