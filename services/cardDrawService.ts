import { Player, PlayerCategory } from "@/types/player";

/**
 * Frequência das cartas especiais no Draft — ajustar só aqui.
 * Nova ordem de raridade (da mais difícil pra mais fácil):
 * Lendária > Rei da América > Artilheiro da Temporada > Auge > Fim de Carreira > Comum.
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

/**
 * Distribuição exclusiva do Draft do modo X1 — Lendária 10%, Rei da América
 * 10%, Auge 20%, Artilheiro da Temporada 25%. Os 35% restantes (Fim de
 * Carreira + Comum) preservam exatamente a MESMA proporção entre as duas
 * categorias que `CARD_CATEGORY_WEIGHTS` já usa (11:65 = ~14,47% Fim de
 * Carreira / ~85,53% Comum dentro desse bloco), só reescalada pra caber nos
 * 35% — é a "lógica já existente" reaproveitada, exatamente como pedido, em
 * vez de inventar uma proporção nova sem justificativa.
 */
const X1_REMAINING_SHARE = 0.35;
const X1_VETERAN_RATIO = CARD_CATEGORY_WEIGHTS.veteran / (CARD_CATEGORY_WEIGHTS.veteran + CARD_CATEGORY_WEIGHTS.common);
export const X1_CARD_CATEGORY_WEIGHTS: Record<PlayerCategory, number> = {
  legend: 0.1,
  kingofamerica: 0.1,
  topscorer: 0.25,
  prime: 0.2,
  veteran: X1_REMAINING_SHARE * X1_VETERAN_RATIO,
  common: X1_REMAINING_SHARE * (1 - X1_VETERAN_RATIO),
  proclubs: 0,
};

function rollCategory(weights: Record<PlayerCategory, number>): PlayerCategory {
  const r = Math.random();
  let acc = 0;
  // Itera direto sobre as chaves do perfil de pesos recebido (na ordem em
  // que foram declaradas, da mais rara pra mais comum) em vez de uma lista
  // separada — assim, qualquer categoria nova adicionada a um perfil de
  // pesos entra automaticamente no sorteio, sem risco de esquecer de
  // atualizar uma segunda lista em outro lugar (foi exatamente isso que
  // aconteceu com "topscorer" numa correção anterior).
  for (const category of Object.keys(weights) as PlayerCategory[]) {
    acc += weights[category];
    if (r < acc) return category;
  }
  return "common";
}

/**
 * Sorteia até `count` jogadores de `players` respeitando a raridade das
 * categorias. Nunca repete jogador dentro do mesmo sorteio. Se a categoria
 * sorteada estiver esgotada no pool recebido, cai para qualquer outra
 * categoria com jogador disponível — nunca retorna menos itens do que o
 * pool realmente permite.
 *
 * `weights` é opcional e por padrão usa `CARD_CATEGORY_WEIGHTS` (o perfil
 * de sempre, usado por Draft Singleplayer/Multiplayer, Liga, Copa e Liga +
 * Mata-Mata) — só o Draft do modo X1 passa `X1_CARD_CATEGORY_WEIGHTS`
 * explicitamente. Nenhum outro chamador precisa mudar nada.
 */
export function drawWeightedByCategory(players: Player[], count: number, weights: Record<PlayerCategory, number> = CARD_CATEGORY_WEIGHTS): Player[] {
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
    let category = rollCategory(weights);
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
