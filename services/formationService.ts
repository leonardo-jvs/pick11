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

/** Painel de formação: cada slot com o jogador que o preenche (ou vazio) */
export function getFormationPanel(
  formation: Formation,
  filledSlots: Record<string, Player>
): (FormationSlot & { player: Player | null })[] {
  return FORMATION_SLOTS[formation].map((slot) => ({ ...slot, player: filledSlots[slot.id] ?? null }));
}
