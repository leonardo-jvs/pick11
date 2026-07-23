import { Player } from "@/types/player";
import { ALL_PLAYERS } from "@/data/players";

export function getAllPlayers(): Player[] {
  return ALL_PLAYERS;
}

function athleteIdentityKey(player: Player): string {
  return player.athleteKey ?? player.name.trim().toLowerCase();
}

/**
 * Monta a pool de jogadores de UMA liga: se um atleta tiver mais de uma carta
 * cadastrada (comum/Auge/Lendária), sorteia aleatoriamente qual delas entra
 * nesta pool — a(s) outra(s) versão(ões) simplesmente não existem nesta
 * partida. Chamado uma única vez, antes do Draft começar (initDraft). Como
 * reservas e times de IA sempre consomem o que sobra desta mesma pool (nunca
 * buscam em getAllPlayers() de novo), a exclusividade vale para a liga inteira.
 */
export function buildLeaguePlayerPool(): Player[] {
  const groups = new Map<string, Player[]>();
  for (const player of ALL_PLAYERS) {
    const key = athleteIdentityKey(player);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(player);
  }

  const pool: Player[] = [];
  for (const versions of groups.values()) {
    const chosen = versions.length === 1 ? versions[0] : versions[Math.floor(Math.random() * versions.length)];
    pool.push(chosen);
  }
  return pool;
}
