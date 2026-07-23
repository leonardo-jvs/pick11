import { Player, PlayerCategory } from "@/types/player";

/**
 * Frequência das cartas especiais no Draft — ajustar só aqui.
 * Nova ordem de raridade (da mais difícil pra mais fácil):
 * Lendária > Rei da América > Auge > Fim de Carreira > Comum.
 * Pro Clubs está temporariamente desativado (peso 0) — nenhuma carta proclubs
 * entra em ALL_PLAYERS (ver data/players/index.ts), então isso aqui é só uma
 * segunda trava de segurança caso o módulo seja reativado no futuro.
 */
export const CARD_CATEGORY_WEIGHTS: Record<PlayerCategory, number> = {
  legend: 0.04,
  kingofamerica: 0.05,
  topscorer: 0.05,
  prime: 0.1,
  veteran: 0.11,
  proclubs: 0,
  common: 0.65,
};

function rollCategory(): PlayerCategory {
  const r = Math.random();
  let acc = 0;
  // Itera direto sobre as chaves de CARD_CATEGORY_WEIGHTS (na ordem em que
  // foram declaradas ali, da mais rara pra mais comum) em vez de uma lista
  // separada — assim, qualquer categoria nova adicionada aos pesos entra
  // automaticamente no sorteio, sem risco de esquecer de atualizar uma
  // segunda lista em outro lugar (foi exatamente isso que aconteceu com
  // "topscorer": o peso existia, mas a categoria nunca era sorteada porque
  // uma lista hardcoded separada, usada só aqui, não tinha sido atualizada).
  for (const category of Object.keys(CARD_CATEGORY_WEIGHTS) as PlayerCategory[]) {
    acc += CARD_CATEGORY_WEIGHTS[category];
    if (r < acc) return category;
  }
  return "common";
}

/**
 * Sorteia até `count` jogadores de `players` respeitando a raridade das
 * categorias (comum / Auge / Lendária). Nunca repete jogador dentro do mesmo
 * sorteio. Se a categoria sorteada estiver esgotada no pool recebido, cai
 * para qualquer outra categoria com jogador disponível — nunca retorna menos
 * itens do que o pool realmente permite.
 */
export function drawWeightedByCategory(players: Player[], count: number): Player[] {
  const buckets: Record<PlayerCategory, Player[]> = {
    common: [],
    kingofamerica: [],
    topscorer: [],
    prime: [],
    veteran: [],
    legend: [],
    proclubs: [],
  };
  for (const p of players) buckets[p.category ?? "common"].push(p);

  const picked: Player[] = [];

  while (picked.length < count && picked.length < players.length) {
    let category = rollCategory();
    if (buckets[category].length === 0) {
      const fallback = (Object.keys(buckets) as PlayerCategory[]).find((c) => buckets[c].length > 0);
      if (!fallback) break;
      category = fallback;
    }
    const idx = Math.floor(Math.random() * buckets[category].length);
    picked.push(buckets[category][idx]);
    buckets[category].splice(idx, 1);
  }

  return picked;
}
