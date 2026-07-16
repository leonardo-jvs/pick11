import { Player, DraftPlayerCard } from "@/types/player";
import { TeamTactics } from "@/types/team";

const STAR_TO_DELTA: Record<1 | 2 | 3, number> = {
  1: 0,
  2: 1,
  3: 2,
};

/**
 * Compatibilidade oficial do Pick11: cada jogador possui exatamente um Estilo
 * de Ataque e um Estilo Defensivo. Compara os dois com a tática do treinador.
 * ⭐⭐⭐ (ataque E defesa iguais) = +2 Overall
 * ⭐⭐ (só um dos dois igual)     = +1 Overall
 * ⭐ (nenhum igual)               = sem bônus
 * Regra de produto: nunca exibir a fórmula, só estrelas + overall final.
 */
export function computeCompatibility(
  player: Player,
  tactics: TeamTactics
): Pick<DraftPlayerCard, "compatibilityStars" | "compatibilityDelta" | "overallFinal"> {
  const attackMatch = player.attackStyle === tactics.attackStyle;
  const defenseMatch = player.defenseStyle === tactics.defenseStyle;

  const matches = [attackMatch, defenseMatch].filter(Boolean).length;
  const stars = (matches === 2 ? 3 : matches === 1 ? 2 : 1) as 1 | 2 | 3;
  const delta = STAR_TO_DELTA[stars];
  const overallFinal = Math.min(99, player.overall + delta);

  return { compatibilityStars: stars, compatibilityDelta: delta, overallFinal };
}

export function toDraftPlayerCard(player: Player, tactics: TeamTactics): DraftPlayerCard {
  return { ...player, ...computeCompatibility(player, tactics) };
}

/** Overall médio do time — soma dos overallFinal dos titulares / 11, arredondado. Nunca exibe a soma. */
export function computeTeamOverall(squad: DraftPlayerCard[] | Player[], tactics: TeamTactics): number {
  if (squad.length === 0) return 0;
  const withCompat = squad.map((p) => ("overallFinal" in p ? p : toDraftPlayerCard(p, tactics)));
  const sum = withCompat.reduce((acc, p) => acc + p.overallFinal, 0);
  return Math.round(sum / withCompat.length);
}

export function computeTeamCompatibilityStars(squad: DraftPlayerCard[] | Player[], tactics: TeamTactics): 1 | 2 | 3 {
  if (squad.length === 0) return 2;
  const withCompat = squad.map((p) => ("compatibilityStars" in p ? p : toDraftPlayerCard(p, tactics)));
  const avg = withCompat.reduce((acc, p) => acc + p.compatibilityStars, 0) / withCompat.length;
  return Math.min(3, Math.max(1, Math.round(avg))) as 1 | 2 | 3;
}
