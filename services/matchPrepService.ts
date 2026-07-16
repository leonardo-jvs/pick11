import { Player } from "@/types/player";
import { Team, Boost } from "@/types/team";
import { BOOST_POSITION_TARGETS, BOOST_OVERALL_BONUS, RECOVERY_PHYSICAL_BONUS } from "@/constants/game";
import { computeTeamOverall } from "@/services/compatibilityService";

export interface EffectiveTeam {
  squad: Player[];
  overall: number;
  physical: number;
  /** Poupar elenco: o físico só volta a 100% DEPOIS da partida, nunca antes (não ajuda no jogo atual) */
  restoresFullPhysicalAfterMatch: boolean;
}

/**
 * Aplica o boost escolhido na Pré-Partida e devolve o "time efetivo" só para
 * esta partida (nunca altera o elenco base do treinador). Os titulares sempre
 * entram em campo — "Poupar elenco" não troca ninguém, só aplica a penalidade.
 */
export function applyBoost(team: Team, boost: Boost): EffectiveTeam {
  const baseSquad = team.starters;
  const targets = BOOST_POSITION_TARGETS[boost];

  let squad = baseSquad;
  if (targets) {
    squad = baseSquad.map((p) => (targets.includes(p.position) ? { ...p, overall: Math.min(99, p.overall + BOOST_OVERALL_BONUS) } : p));
  } else if (boost === "Poupar elenco") {
    // todos os titulares recebem -3 de Overall nesta partida
    squad = baseSquad.map((p) => ({ ...p, overall: Math.max(40, p.overall - BOOST_OVERALL_BONUS) }));
  }

  let physical = team.physical;
  if (boost === "Recuperação rápida") {
    physical = Math.min(100, Math.round(physical + 100 * RECOVERY_PHYSICAL_BONUS));
  }
  // "Poupar elenco" NÃO melhora o físico para esta partida — o retorno a 100%
  // só acontece depois que a partida termina (aplicado pela tela de Simulação).

  const physicalAdjustment = Math.round((physical - 100) / 12);
  const overall = Math.max(40, computeTeamOverall(squad, team.tactics) + physicalAdjustment);

  return { squad, overall, physical, restoresFullPhysicalAfterMatch: boost === "Poupar elenco" };
}
