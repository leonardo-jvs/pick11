import { Player } from "@/types/player";
import { Team, Boost } from "@/types/team";
import { Match } from "@/types/match";
import { BOOST_POSITION_TARGETS, BOOST_OVERALL_BONUS } from "@/constants/game";
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
  // "Poupar elenco" NÃO melhora o físico para esta partida — o retorno a 100%
  // só acontece depois que a partida termina (aplicado pela tela de Simulação).

  // Físico baixo agora pesa de verdade: até ~8 pontos de Overall no físico
  // mínimo (45%), o suficiente pra administrar o desgaste ser uma escolha
  // estratégica real ao longo da temporada, não só um número decorativo.
  const physicalAdjustment = Math.round((physical - 100) / 7);
  const overall = Math.max(40, computeTeamOverall(squad, team.tactics) + physicalAdjustment);

  return { squad, overall, physical, restoresFullPhysicalAfterMatch: boost === "Poupar elenco" };
}

/**
 * Quantas vezes um time já usou um bônus, contado direto do histórico real de
 * partidas — não de um contador local em memória. Cada `Match` já grava qual
 * bônus cada lado usou (`homeBoost`/`awayBoost`), e esse histórico é
 * sincronizado via Supabase junto com o resto da competição. Isso garante que
 * a contagem reflita o uso de verdade em qualquer modo (Single ou
 * Multiplayer) e sobreviva a um F5 no meio da competição, o que um contador
 * só-no-navegador nunca conseguiria.
 */
export function countBoostUsage(matches: Match[], teamId: string, boost: Boost): number {
  return matches.reduce((count, match) => {
    const usedBoost = match.homeTeamId === teamId ? match.homeBoost : match.awayTeamId === teamId ? match.awayBoost : undefined;
    return usedBoost === boost ? count + 1 : count;
  }, 0);
}
