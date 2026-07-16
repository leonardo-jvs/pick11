export const ROOM_CONFIG = {
  MIN_PLAYERS: 2,
  MAX_PLAYERS: 20,
} as const;

export const DRAFT_CONFIG = {
  PICK_TIMER_SECONDS: 10,
  STARTERS_DRAFTED: 11, // titulares escolhidos pelo usuário no draft
  RESERVE_SQUAD_SIZE: 7, // reservas geradas automaticamente pela IA após o draft
  SQUAD_SIZE: 18, // 11 titulares + 7 reservas
  CANDIDATES_PER_ROUND: 6, // jogadores mostrados por rodada
  PICKS_PER_ROUND: 2, // escolhas por rodada (a última rodada de cada participante pode pedir só 1, se sobrar ímpar)
  BOT_PICK_ANIMATION_MS: 1400,
} as const;

export const LEAGUE_CONFIG = {
  TOTAL_CLUBS: 20,
  TOTAL_ROUNDS: 38, // turno + returno
  FIRST_LEG_ROUNDS: 19,
  TACTICAL_ADJUSTMENT_ROUND: 19, // ajuste liberado após esta rodada
  TACTICAL_ADJUSTMENT_TIMER_SECONDS: 15,
} as const;

export const PRE_MATCH_CONFIG = {
  TIMER_SECONDS: 10,
  STARTERS_COUNT: 11,
} as const;

export const LIVE_MATCH_CONFIG = {
  NARRATION_SECONDS: 5,
  STATS_SECONDS: 5,
} as const;

export const SIMULATION_CONFIG = {
  DURATION_SECONDS: 10,
} as const;

export const FORMATIONS = ["4-3-3", "4-4-2"] as const;

export const PLAY_STYLES = {
  attack: ["Posse", "Contra-ataque", "Cruzamentos"] as const,
  defense: ["Pressão alta", "Bloco médio", "Linha baixa"] as const,
};

export const BOOSTS = ["Nenhum", "Bicho", "Jogo importante", "Recuperação rápida", "Poupar elenco"] as const;

/** Opções realmente selecionáveis na Pré-Partida — "Nenhum" não é mais um botão, é o padrão quando o tempo esgota sem escolha. */
export const SELECTABLE_BOOSTS = BOOSTS.filter((b) => b !== "Nenhum");

export const BOOST_USES: Record<(typeof BOOSTS)[number], number | null> = {
  Nenhum: null,
  Bicho: 2,
  "Jogo importante": 2,
  "Recuperação rápida": 2,
  "Poupar elenco": null, // sem limite de usos, mas com penalidade de desempenho
};

/**
 * Sistema de posições simplificado: o meio-campo (VOL + MEI) é tratado como um
 * bloco único ("MC"), então o Bicho — que mira em MC + ATA — precisa cobrir as
 * duas posições reais que formam o meio-campo. Jogo importante nunca atinge o
 * meio-campo, só a linha defensiva + goleiro.
 */
export const BOOST_POSITION_TARGETS: Record<string, string[]> = {
  Bicho: ["VOL", "MEI", "ATA"],
  "Jogo importante": ["GOL", "ZAG", "LAT"],
};

export const BOOST_OVERALL_BONUS = 3;
export const RECOVERY_PHYSICAL_BONUS = 0.25; // ~25% do físico

export const DEFAULT_TACTICS = {
  formation: "4-3-3",
  attackStyle: "Posse",
  defenseStyle: "Bloco médio",
} as const;
