import { Player, Position } from "@/types/player";
import { generateId, randomBetween } from "@/lib/delay";
import { getAllPlayers } from "@/services/playerRepository";

const FIRST_NAMES = [
  "Caio", "Bruno", "Diego", "Marcos", "Igor", "Rodrigo", "Vitor", "Daniel", "Felipe", "Renato",
  "Hugo", "Otávio", "Samuel", "Danilo", "Leandro", "Fábio", "Elias", "Nathan", "Murilo", "Cauã",
];
const LAST_NAMES = [
  "Souza", "Alves", "Ferreira", "Barbosa", "Costa", "Ribeiro", "Nunes", "Cardoso", "Teixeira", "Moreira",
  "Pereira", "Rocha", "Dias", "Vieira", "Correia", "Lopes", "Farias", "Batista", "Duarte", "Azevedo",
];

const POSITION_POOL: Position[] = ["GOL", "ZAG", "ZAG", "LAT", "LAT", "VOL", "VOL", "MEI", "MEI", "ATA", "ATA"];

/**
 * Cria um Set de nomes "usados" já pré-populado com todos os atletas reais do
 * banco de dados. Sem isso, um jogador fictício de preenchimento poderia por
 * acaso sortear o mesmo nome de um atleta real (ex: "Hugo Souza") e criar um
 * segundo "atleta" duplicado na liga — o mesmo problema que a exclusividade
 * de cartas resolve para as versões comum/Auge/Lendária, só que pro lado dos
 * nomes fictícios. Usar esta função em vez de `new Set()` sempre que for
 * gerar jogadores de preenchimento para uma liga.
 */
export function createFillerNameGuard(): Set<string> {
  return new Set(getAllPlayers().map((p) => p.name));
}

function randomName(usedNames: Set<string>): string {
  let name = "";
  let attempts = 0;
  do {
    name = `${FIRST_NAMES[randomBetween(0, FIRST_NAMES.length - 1)]} ${LAST_NAMES[randomBetween(0, LAST_NAMES.length - 1)]}`;
    attempts++;
    if (attempts > 50) {
      name = `${name} ${randomBetween(2, 999)}`;
      break;
    }
  } while (usedNames.has(name));
  usedNames.add(name);
  return name;
}

const ATTACK_STYLES = ["Posse", "Contra-ataque", "Cruzamentos"] as const;
const DEFENSE_STYLES = ["Pressão alta", "Bloco médio", "Linha baixa"] as const;

/** Gera jogadores fictícios para completar elencos de clubes-bot quando o pool real acaba */
export function generateFillerPlayers(count: number, club: string, usedNames: Set<string>, forcedPosition?: Position): Player[] {
  return Array.from({ length: count }, () => {
    const position = forcedPosition ?? POSITION_POOL[randomBetween(0, POSITION_POOL.length - 1)];
    return {
      id: generateId("filler"),
      name: randomName(usedNames),
      club,
      position,
      overall: randomBetween(58, 79),
      attackStyle: ATTACK_STYLES[randomBetween(0, ATTACK_STYLES.length - 1)],
      defenseStyle: DEFENSE_STYLES[randomBetween(0, DEFENSE_STYLES.length - 1)],
      physical: randomBetween(65, 90),
    };
  });
}
