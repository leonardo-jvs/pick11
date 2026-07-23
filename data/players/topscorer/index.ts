import { Player } from "@/types/player";

/**
 * "Artilheiro da Temporada" — representa o jogador que terminou determinado
 * ano como maior artilheiro do futebol brasileiro, considerando todas as
 * competições oficiais disputadas naquela temporada (não só o Brasileirão).
 *
 * IMPORTANTE — sobre a lista original pedida: 9 dos 23 artilheiros pedidos
 * caíam exatamente na mesma temporada e clube de uma carta que já existe no
 * banco (a maioria Auge, uma Comum) — faz sentido, já que a temporada de
 * artilheiro de um jogador costuma ser exatamente a que eu já tinha
 * escolhido pra representar o "Auge" dele em sprints anteriores. Como a
 * regra deste banco proíbe duas cartas representando a mesma temporada+clube
 * de um jogador (evita duplicata visual na Coleção/Packs), e esta tarefa
 * pediu explicitamente para NÃO remover nem alterar nenhuma carta existente,
 * as 9 que colidiam ficaram de fora, sem inventar nenhum dado pra "resolver"
 * o conflito:
 *   - Diego Tardelli 2009/Atlético Mineiro (já existe como Auge)
 *   - Kléber Pereira 2008/Santos (já existe como Auge)
 *   - Leandro Damião 2011/Internacional (já existe como Auge)
 *   - Luís Fabiano 2012/São Paulo (já existe como Auge)
 *   - Ricardo Oliveira 2015/Santos (já existe como Auge)
 *   - Diego Souza 2016/Sport (já existe como Auge)
 *   - Hulk 2021/Atlético Mineiro (já existe como Auge)
 *   - Germán Cano 2022/Fluminense (já existe como Auge)
 *   - Kaio Jorge 2025/Cruzeiro (já existe como Comum, mesma temporada atual)
 *
 * Faixa de Overall: sempre acima da Comum (80-88), competitiva com a Auge
 * (84-91), sempre abaixo da Lendária e do Rei da América (90+) — conforme
 * pedido, sem inflar além do que a temporada histórica justifica.
 */
export const TOP_SCORER_PLAYERS: Player[] = [
  { id: "ts-yurialberto-2024", name: "Yuri Alberto", club: "Corinthians", season: "2024", position: "ATA", overall: 87, attackStyle: "Contra-ataque", defenseStyle: "Pressão alta", physical: 85, category: "topscorer" },
  { id: "ts-gustavo-2018", name: "Gustavo (Gustagol)", club: "Fortaleza", season: "2018", position: "ATA", overall: 87, attackStyle: "Contra-ataque", defenseStyle: "Bloco médio", physical: 84, category: "topscorer" },
  { id: "ts-henriquedourado-2017", name: "Henrique Dourado", club: "Fluminense", season: "2017", position: "ATA", overall: 88, attackStyle: "Contra-ataque", defenseStyle: "Bloco médio", physical: 84, category: "topscorer" },
  { id: "ts-fred-2014", name: "Fred", club: "Fluminense", season: "2014", position: "ATA", overall: 87, attackStyle: "Posse", defenseStyle: "Bloco médio", physical: 83, category: "topscorer" },
  { id: "ts-hernane-2013", name: "Hernane", club: "Flamengo", season: "2013", position: "ATA", overall: 85, attackStyle: "Contra-ataque", defenseStyle: "Bloco médio", physical: 84, category: "topscorer" },
  { id: "ts-jonas-2010", name: "Jonas", club: "Grêmio", season: "2010", position: "ATA", overall: 86, attackStyle: "Contra-ataque", defenseStyle: "Bloco médio", physical: 85, category: "topscorer" },
  { id: "ts-josiel-2007", name: "Josiel", club: "Paraná", season: "2007", position: "ATA", overall: 84, attackStyle: "Contra-ataque", defenseStyle: "Bloco médio", physical: 84, category: "topscorer" },
  { id: "ts-souza-2006", name: "Souza", club: "Goiás", season: "2006", position: "ATA", overall: 84, attackStyle: "Contra-ataque", defenseStyle: "Bloco médio", physical: 84, category: "topscorer" },
  { id: "ts-washington-2004", name: "Washington", club: "Athletico Paranaense", season: "2004", position: "ATA", overall: 88, attackStyle: "Contra-ataque", defenseStyle: "Pressão alta", physical: 85, category: "topscorer" },
  { id: "ts-dimba-2003", name: "Dimba", club: "Goiás", season: "2003", position: "ATA", overall: 84, attackStyle: "Contra-ataque", defenseStyle: "Bloco médio", physical: 84, category: "topscorer" },
  { id: "ts-guilherme-1999", name: "Guilherme", club: "Atlético Mineiro", season: "1999", position: "ATA", overall: 85, attackStyle: "Contra-ataque", defenseStyle: "Bloco médio", physical: 84, category: "topscorer" },
  { id: "ts-amoroso-1994", name: "Amoroso", club: "Guarani", season: "1994", position: "ATA", overall: 85, attackStyle: "Contra-ataque", defenseStyle: "Bloco médio", physical: 84, category: "topscorer" },
  { id: "ts-guga-1993", name: "Guga", club: "Santos", season: "1993", position: "ATA", overall: 85, attackStyle: "Contra-ataque", defenseStyle: "Bloco médio", physical: 83, category: "topscorer" },
  { id: "ts-dadamaravilha-1971", name: "Dadá Maravilha", club: "Atlético Mineiro", season: "1971", position: "ATA", overall: 88, attackStyle: "Contra-ataque", defenseStyle: "Bloco médio", physical: 84, category: "topscorer" },
];
