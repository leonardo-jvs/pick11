import { Position } from "@/types/player";
import { Formation } from "@/types/team";

export interface FormationSlot {
  id: string;
  label: string; // rótulo exibido no painel, ex: "LD", "ZAG", "MC"
  /** Uma ou mais posições base que podem ocupar este slot (ex: MC aceita VOL ou MEI) */
  acceptedPositions: Position[];
  /** Linha do campo, usada só para agrupar visualmente (Resumo do Draft, mini-campos) */
  row: "goleiro" | "defesa" | "meio" | "ataque";
}

/**
 * Cada formação define exatamente 11 slots (os titulares escolhidos no Draft).
 * Sistema simplificado: o meio-campo é sempre "MC" (aceita VOL ou MEI
 * automaticamente) e o ataque é sempre "ATA" — sem distinguir ponta esquerda/
 * direita/centroavante, já que o Pick11 não modela essa posição separadamente.
 */
export const FORMATION_SLOTS: Record<Formation, FormationSlot[]> = {
  "4-3-3": [
    { id: "gol", label: "GOL", acceptedPositions: ["GOL"], row: "goleiro" },
    { id: "lat-d", label: "LD", acceptedPositions: ["LAT"], row: "defesa" },
    { id: "zag-1", label: "ZAG", acceptedPositions: ["ZAG"], row: "defesa" },
    { id: "zag-2", label: "ZAG", acceptedPositions: ["ZAG"], row: "defesa" },
    { id: "lat-e", label: "LE", acceptedPositions: ["LAT"], row: "defesa" },
    { id: "mc-1", label: "MC", acceptedPositions: ["VOL", "MEI"], row: "meio" },
    { id: "mc-2", label: "MC", acceptedPositions: ["VOL", "MEI"], row: "meio" },
    { id: "mc-3", label: "MC", acceptedPositions: ["VOL", "MEI"], row: "meio" },
    { id: "ata-1", label: "ATA", acceptedPositions: ["ATA"], row: "ataque" },
    { id: "ata-2", label: "ATA", acceptedPositions: ["ATA"], row: "ataque" },
    { id: "ata-3", label: "ATA", acceptedPositions: ["ATA"], row: "ataque" },
  ],
  "4-4-2": [
    { id: "gol", label: "GOL", acceptedPositions: ["GOL"], row: "goleiro" },
    { id: "lat-d", label: "LD", acceptedPositions: ["LAT"], row: "defesa" },
    { id: "zag-1", label: "ZAG", acceptedPositions: ["ZAG"], row: "defesa" },
    { id: "zag-2", label: "ZAG", acceptedPositions: ["ZAG"], row: "defesa" },
    { id: "lat-e", label: "LE", acceptedPositions: ["LAT"], row: "defesa" },
    { id: "me", label: "ME", acceptedPositions: ["ATA"], row: "meio" },
    { id: "mc-1", label: "MC", acceptedPositions: ["MEI", "VOL"], row: "meio" },
    { id: "mc-2", label: "MC", acceptedPositions: ["MEI", "VOL"], row: "meio" },
    { id: "md", label: "MD", acceptedPositions: ["ATA"], row: "meio" },
    { id: "ata-1", label: "ATA", acceptedPositions: ["ATA"], row: "ataque" },
    { id: "ata-2", label: "ATA", acceptedPositions: ["ATA"], row: "ataque" },
  ],
};
