import { Player } from "@/types/player";
import { Formation } from "@/types/team";
import { FORMATION_SLOTS, FormationSlot } from "@/constants/formations";

export function getFormationSlots(formation: Formation): FormationSlot[] {
  return FORMATION_SLOTS[formation];
}

/**
 * Encontra o melhor slot vago para o jogador: tenta a posição primária primeiro,
 * depois as posições secundárias na ordem em que foram declaradas. Um slot é
 * compatível se aceitar a posição do jogador (ex: MC aceita VOL ou MEI).
 * Retorna null se todas as posições possíveis já estiverem preenchidas.
 */
export function findBestSlot(
  player: Player,
  formation: Formation,
  filledSlotIds: Set<string>
): FormationSlot | null {
  const slots = FORMATION_SLOTS[formation];
  const candidatePositions = [player.position, ...(player.secondaryPositions ?? [])];

  for (const position of candidatePositions) {
    const openSlot = slots.find((slot) => slot.acceptedPositions.includes(position) && !filledSlotIds.has(slot.id));
    if (openSlot) return openSlot;
  }
  return null;
}

export function isPlayerEligible(player: Player, formation: Formation, filledSlotIds: Set<string>): boolean {
  return findBestSlot(player, formation, filledSlotIds) !== null;
}

/**
 * Posiciona uma lista de jogadores (sem slot pré-atribuído) nas coordenadas
 * corretas da formação — usado sempre que só temos o elenco (ex: Pré-Partida,
 * elenco de bots), nunca o mapeamento exato de slot que o Draft já tem. Cada
 * jogador vai para a posição que melhor completa a formação, respeitando
 * posição primária e secundárias (mesma regra do Draft).
 */
export function assignPlayersToSlots(players: Player[], formation: Formation): Record<string, Player> {
  const slots = FORMATION_SLOTS[formation];
  const filled: Record<string, Player> = {};
  const filledSlotIds = new Set<string>();
  let remaining = [...players];

  for (const slot of slots) {
    const candidate = remaining.find((p) => slot.acceptedPositions.includes(p.position));
    const fallback = candidate ?? remaining.find((p) => (p.secondaryPositions ?? []).some((sp) => slot.acceptedPositions.includes(sp)));
    const chosen = candidate ?? fallback;
    if (chosen) {
      filled[slot.id] = chosen;
      filledSlotIds.add(slot.id);
      remaining = remaining.filter((p) => p.id !== chosen.id);
    }
  }

  return filled;
}
export function getFormationPanel(
  formation: Formation,
  filledSlots: Record<string, Player>
): (FormationSlot & { player: Player | null })[] {
  return FORMATION_SLOTS[formation].map((slot) => ({ ...slot, player: filledSlots[slot.id] ?? null }));
}
