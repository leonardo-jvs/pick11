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
