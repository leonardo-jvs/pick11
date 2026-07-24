import { Player, Position } from "@/types/player";
import { Formation } from "@/types/team";
import { FORMATION_SLOTS } from "@/constants/formations";
import { generateFillerPlayers } from "@/mocks/syntheticPlayers";

/** Banco de reservas — 7 vagas cobrindo todas as posições do campo, nunca deixa uma posição sem cobertura. */
export const RESERVE_POSITION_TEMPLATE: Position[] = ["GOL", "ZAG", "LAT", "VOL", "MEI", "MEI", "ATA"];

function pickBestForPosition(pool: Player[], acceptedPositions: Position[]): Player | null {
  const candidates = pool.filter(
    (p) => acceptedPositions.includes(p.position) || (p.secondaryPositions ?? []).some((sp) => acceptedPositions.includes(sp))
  );
  if (candidates.length === 0) return null;
  return candidates.reduce((best, p) => (p.overall > best.overall ? p : best), candidates[0]);
}

/**
 * Monta os 11 titulares de um time de IA respeitando exatamente os slots da
 * formação escolhida — mesma regra usada no Draft dos usuários (posição
 * primária ou secundária, slots multi-posição como MC aceitando VOL ou MEI).
 * Sempre pega o melhor jogador disponível no pool para cada slot; se o pool
 * não tiver ninguém elegível, gera um jogador fictício já na posição certa.
 *
 * Usado apenas para o BANCO DE RESERVAS dos jogadores HUMANOS (montado
 * automaticamente após o Draft) — nunca para os times de bot, que usam
 * `buildBotStartersForFormation`/`buildBotReserveSquad` (mais abaixo), com
 * aleatoriedade ponderada em vez de sempre pegar o melhor disponível.
 */
export function buildStartersForFormation(
  pool: Player[],
  formation: Formation,
  clubName: string,
  usedNames: Set<string>
): { starters: Player[]; remainingPool: Player[] } {
  let remaining = [...pool];
  const starters: Player[] = [];

  for (const slot of FORMATION_SLOTS[formation]) {
    const best = pickBestForPosition(remaining, slot.acceptedPositions);
    if (best) {
      starters.push(best);
      remaining = remaining.filter((p) => p.id !== best.id);
    } else {
      starters.push(generateFillerPlayers(1, clubName, usedNames, slot.acceptedPositions[0])[0]);
    }
  }

  return { starters, remainingPool: remaining };
}

/**
 * Monta um banco de 7 reservas respeitando posições: tenta achar no pool um
 * jogador de cada posição do template; quando o pool não tem mais daquela
 * posição, gera um jogador fictício já na posição certa.
 *
 * Usado pelo Draft para montar automaticamente as reservas dos jogadores
 * HUMANOS — não usado pelos times de bot (ver `buildBotReserveSquad`).
 */
export function buildReserveSquad(
  pool: Player[],
  clubName: string,
  usedNames: Set<string>
): { reserves: Player[]; remainingPool: Player[] } {
  let remaining = [...pool];
  const reserves: Player[] = [];

  for (const position of RESERVE_POSITION_TEMPLATE) {
    const idx = remaining.findIndex((p) => p.position === position);
    if (idx >= 0) {
      reserves.push(remaining[idx]);
      remaining = [...remaining.slice(0, idx), ...remaining.slice(idx + 1)];
    } else {
      reserves.push(generateFillerPlayers(1, clubName, usedNames, position)[0]);
    }
  }

  return { reserves, remainingPool: remaining };
}

// ============================================================================
// Montagem de elenco dos BOTS — aleatoriedade ponderada + teto de craques +
// personalidades. Tudo isolado aqui embaixo: não reaproveita nem altera
// `pickBestForPosition`/`buildStartersForFormation`/`buildReserveSquad`
// acima, que continuam intocadas para o Draft/reservas dos humanos.
// ============================================================================

export type BotPersonality = "elite" | "jovem" | "defensivo" | "equilibrado" | "aventureiro";

export const BOT_PERSONALITIES: BotPersonality[] = ["elite", "jovem", "defensivo", "equilibrado", "aventureiro"];

const ATTACKING_POSITIONS: Position[] = ["ATA", "MEI"];
const DEFENSIVE_POSITIONS: Position[] = ["GOL", "ZAG", "LAT", "VOL"];

/**
 * Chance de escolher o 1º/2º/3º melhor candidato elegível pra vaga; o que
 * sobra (a cauda da distribuição) é sorteado entre o restante dos elegíveis.
 * "equilibrado" é exatamente o 70/20/10 sugerido; as outras personalidades
 * variam esse comportamento pra criar bots que parecem outros jogadores.
 */
const PERSONALITY_WEIGHTS: Record<BotPersonality, number[]> = {
  elite: [0.78, 0.16, 0.06],
  jovem: [0.48, 0.27, 0.25],
  defensivo: [0.68, 0.2, 0.12],
  equilibrado: [0.62, 0.23, 0.15],
  aventureiro: [0.4, 0.25, 0.35],
};

/** Quantos jogadores 90+ um bot consegue acumular antes do algoritmo começar a preferir opções um pouco inferiores, quando existirem. */
const ELITE_OVERALL_THRESHOLD = 90;
const ELITE_CAP_BY_PERSONALITY: Record<BotPersonality, number> = {
  elite: 7, // é o "estilo" desse bot ter muito craque — não faz sentido limitar como os outros
  jovem: 3,
  defensivo: 3,
  equilibrado: 3,
  aventureiro: 2,
};

function weightsForSlot(personality: BotPersonality, acceptedPositions: Position[]): number[] {
  const isAttackSlot = acceptedPositions.some((p) => ATTACKING_POSITIONS.includes(p));
  const isDefenseSlot = acceptedPositions.some((p) => DEFENSIVE_POSITIONS.includes(p));
  // "Jovem" capricha mais no ataque; "Defensivo" capricha mais atrás — fora
  // da própria especialidade, comportamento neutro (equilibrado).
  if (personality === "jovem") return isAttackSlot ? PERSONALITY_WEIGHTS.jovem : PERSONALITY_WEIGHTS.equilibrado;
  if (personality === "defensivo") return isDefenseSlot ? PERSONALITY_WEIGHTS.defensivo : PERSONALITY_WEIGHTS.equilibrado;
  return PERSONALITY_WEIGHTS[personality];
}

/**
 * Escolhe um jogador pra uma vaga de um time de BOT. Nunca sempre o melhor
 * disponível: sorteia entre os melhores elegíveis com pesos que variam por
 * personalidade (70/20/10 no caso "equilibrado"), e respeita um teto de
 * jogadores 90+ já acumulados pelo time — depois do teto, joga os 90+ pro
 * fim da lista de prioridade (SEM excluí-los — se não sobrar mais ninguém
 * abaixo do teto, o craque ainda pode ser escolhido; a posição nunca fica
 * sem preencher por causa disso).
 */
function pickForBotPosition(
  pool: Player[],
  acceptedPositions: Position[],
  eliteCountSoFar: number,
  personality: BotPersonality
): Player | null {
  const candidates = pool.filter(
    (p) => acceptedPositions.includes(p.position) || (p.secondaryPositions ?? []).some((sp) => acceptedPositions.includes(sp))
  );
  if (candidates.length === 0) return null;

  let sorted = [...candidates].sort((a, b) => b.overall - a.overall);

  const eliteCap = ELITE_CAP_BY_PERSONALITY[personality];
  if (eliteCountSoFar >= eliteCap) {
    const nonElite = sorted.filter((p) => p.overall < ELITE_OVERALL_THRESHOLD);
    const elite = sorted.filter((p) => p.overall >= ELITE_OVERALL_THRESHOLD);
    if (nonElite.length > 0) sorted = [...nonElite, ...elite];
  }

  const weights = weightsForSlot(personality, acceptedPositions);
  const r = Math.random();
  let acc = 0;
  for (let i = 0; i < weights.length; i++) {
    acc += weights[i];
    if (r < acc && sorted[i]) return sorted[i];
  }
  const rest = sorted.slice(weights.length);
  if (rest.length > 0) return rest[Math.floor(Math.random() * rest.length)];
  return sorted[0];
}

/** Versão de `buildStartersForFormation` exclusiva pra times de bot — usa `pickForBotPosition` em vez de sempre pegar o melhor disponível. */
export function buildBotStartersForFormation(
  pool: Player[],
  formation: Formation,
  clubName: string,
  usedNames: Set<string>,
  personality: BotPersonality
): { starters: Player[]; remainingPool: Player[] } {
  let remaining = [...pool];
  const starters: Player[] = [];
  let eliteCount = 0;

  for (const slot of FORMATION_SLOTS[formation]) {
    const chosen = pickForBotPosition(remaining, slot.acceptedPositions, eliteCount, personality);
    if (chosen) {
      starters.push(chosen);
      remaining = remaining.filter((p) => p.id !== chosen.id);
      if (chosen.overall >= ELITE_OVERALL_THRESHOLD) eliteCount++;
    } else {
      starters.push(generateFillerPlayers(1, clubName, usedNames, slot.acceptedPositions[0])[0]);
    }
  }

  return { starters, remainingPool: remaining };
}

/** Versão de `buildReserveSquad` exclusiva pra times de bot — mesma ideia, aplicada ao banco de reservas. */
export function buildBotReserveSquad(
  pool: Player[],
  clubName: string,
  usedNames: Set<string>,
  personality: BotPersonality,
  eliteCountFromStarters: number
): { reserves: Player[]; remainingPool: Player[] } {
  let remaining = [...pool];
  const reserves: Player[] = [];
  let eliteCount = eliteCountFromStarters;

  for (const position of RESERVE_POSITION_TEMPLATE) {
    const chosen = pickForBotPosition(remaining, [position], eliteCount, personality);
    if (chosen) {
      reserves.push(chosen);
      remaining = remaining.filter((p) => p.id !== chosen.id);
      if (chosen.overall >= ELITE_OVERALL_THRESHOLD) eliteCount++;
    } else {
      reserves.push(generateFillerPlayers(1, clubName, usedNames, position)[0]);
    }
  }

  return { reserves, remainingPool: remaining };
}
