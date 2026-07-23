import { Player } from "@/types/player";

/**
 * "Artilheiro da Temporada" — representa o jogador que terminou determinado
 * ano como maior artilheiro do futebol brasileiro, considerando todas as
 * competições oficiais disputadas naquela temporada (não só o Brasileirão).
 *
 * Regra de substituição: quando a temporada de artilheiro coincide
 * exatamente com uma carta Comum ou Auge já existente do mesmo jogador no
 * mesmo clube, essa carta é substituída por esta (nunca existem as duas ao
 * mesmo tempo) — evita duplicata visual na Coleção/Packs. Lendária, Rei da
 * América e Fim de Carreira NUNCA são substituídas, mesmo colidindo.
 * Temporadas diferentes do mesmo jogador continuam existindo normalmente
 * (ex: Fred 2012 continua Auge; só o Fred 2014 é Artilheiro da Temporada).
 *
 * Substituídas nesta correção (removidas de seus arquivos originais):
 *   - Kaio Jorge 2025/Cruzeiro (era Comum)
 *   - Hulk 2021/Atlético Mineiro (era Auge)
 *   - Germán Cano 2022/Fluminense (era Auge)
 *   - Diego Souza 2016/Sport (era Auge)
 *   - Ricardo Oliveira 2015/Santos (era Auge)
 *   - Luís Fabiano 2012/São Paulo (era Auge)
 *   - Leandro Damião 2011/Internacional (era Auge)
 *   - Kléber Pereira 2008/Santos (era Auge)
 *   - Diego Tardelli 2009/Atlético Mineiro (era Auge)
 *
 * Faixa de Overall: sempre acima da Comum (80-88), competitiva com a Auge
 * (84-91), sempre abaixo da Lendária e do Rei da América (90+) — conforme
 * pedido, sem inflar além do que a temporada histórica justifica.
 */
export const TOP_SCORER_PLAYERS: Player[] = [
  { id: "ts-kaiojorge-2025", name: "Kaio Jorge", club: "Cruzeiro", season: "2025", position: "ATA", overall: 86, attackStyle: "Contra-ataque", defenseStyle: "Pressão alta", physical: 84, category: "topscorer" },
  { id: "ts-hulk-2021", name: "Hulk", club: "Atlético Mineiro", season: "2021", position: "ATA", secondaryPositions: ["MEI"], overall: 89, attackStyle: "Contra-ataque", defenseStyle: "Bloco médio", physical: 89, category: "topscorer", athleteKey: "hulk" },
  { id: "ts-germancano-2022", name: "Germán Cano", club: "Fluminense", season: "2022", position: "ATA", overall: 88, attackStyle: "Contra-ataque", defenseStyle: "Bloco médio", physical: 83, category: "topscorer", athleteKey: "germancano" },
  { id: "ts-diegosouza-2016", name: "Diego Souza", club: "Sport", season: "2016", position: "ATA", secondaryPositions: ["MEI"], overall: 86, attackStyle: "Contra-ataque", defenseStyle: "Bloco médio", physical: 82, category: "topscorer", athleteKey: "diegosouza" },
  { id: "ts-ricardooliveira-2015", name: "Ricardo Oliveira", club: "Santos", season: "2015", position: "ATA", overall: 88, attackStyle: "Contra-ataque", defenseStyle: "Bloco médio", physical: 83, category: "topscorer" },
  { id: "ts-luisfabiano-2012", name: "Luís Fabiano", club: "São Paulo", season: "2012", position: "ATA", overall: 88, attackStyle: "Contra-ataque", defenseStyle: "Pressão alta", physical: 85, category: "topscorer", athleteKey: "luisfabiano" },
  { id: "ts-leandrodamiao-2011", name: "Leandro Damião", club: "Internacional", season: "2011", position: "ATA", overall: 87, attackStyle: "Cruzamentos", defenseStyle: "Bloco médio", physical: 88, category: "topscorer" },
  { id: "ts-kleberpereira-2008", name: "Kléber Pereira", club: "Santos", season: "2008", position: "ATA", overall: 84, attackStyle: "Contra-ataque", defenseStyle: "Pressão alta", physical: 88, category: "topscorer" },
  { id: "ts-diegotardelli-2009", name: "Diego Tardelli", club: "Atlético Mineiro", season: "2009", position: "ATA", overall: 85, attackStyle: "Contra-ataque", defenseStyle: "Bloco médio", physical: 88, category: "topscorer" },
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
