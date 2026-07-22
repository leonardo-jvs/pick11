import { Player } from "@/types/player";

/**
 * "Rei da América" — vencedores oficiais do prêmio de melhor jogador da
 * América do Sul (concedido pelo jornal uruguaio El País desde 1971),
 * enquanto atuavam por um clube brasileiro na temporada em que venceram.
 * Lista completa e oficial (fonte: ge.globo.com).
 *
 * Overall sempre abaixo do teto das cartas Lendárias mais fortes (Pelé e
 * Zico em 96) — nunca passa de 94 aqui, preservando a hierarquia pedida:
 * Lendária > Rei da América > Auge > Fim de Carreira > Comum.
 */
export const KING_OF_AMERICA_PLAYERS: Player[] = [
  { id: "koa-tostao-1971", name: "Tostão", club: "Cruzeiro", season: "1971", position: "ATA", overall: 90, attackStyle: "Contra-ataque", defenseStyle: "Bloco médio", physical: 88, category: "kingofamerica" },
  { id: "koa-pele-1973", name: "Pelé", club: "Santos", season: "1973", position: "ATA", overall: 94, attackStyle: "Contra-ataque", defenseStyle: "Bloco médio", physical: 88, category: "kingofamerica" },
  { id: "koa-zico-1977", name: "Zico", club: "Flamengo", season: "1977", position: "MEI", secondaryPositions: ["ATA"], overall: 91, attackStyle: "Posse", defenseStyle: "Bloco médio", physical: 88, category: "kingofamerica" },
  { id: "koa-eliasfigueroa-1974", name: "Elías Figueroa", club: "Internacional", season: "1974", position: "ZAG", overall: 90, attackStyle: "Posse", defenseStyle: "Linha baixa", physical: 88, category: "kingofamerica" },
  { id: "koa-eliasfigueroa-1975", name: "Elías Figueroa", club: "Internacional", season: "1975", position: "ZAG", overall: 91, attackStyle: "Posse", defenseStyle: "Linha baixa", physical: 88, category: "kingofamerica" },
  { id: "koa-eliasfigueroa-1976", name: "Elías Figueroa", club: "Internacional", season: "1976", position: "ZAG", overall: 92, attackStyle: "Posse", defenseStyle: "Linha baixa", physical: 88, category: "kingofamerica" },
  { id: "koa-zico-1981", name: "Zico", club: "Flamengo", season: "1981", position: "MEI", secondaryPositions: ["ATA"], overall: 93, attackStyle: "Posse", defenseStyle: "Bloco médio", physical: 88, category: "kingofamerica" },
  { id: "koa-zico-1982", name: "Zico", club: "Flamengo", season: "1982", position: "MEI", secondaryPositions: ["ATA"], overall: 94, attackStyle: "Posse", defenseStyle: "Bloco médio", physical: 88, category: "kingofamerica" },
  { id: "koa-socrates-1983", name: "Sócrates", club: "Corinthians", season: "1983", position: "MEI", overall: 92, attackStyle: "Posse", defenseStyle: "Bloco médio", physical: 88, category: "kingofamerica" },
  { id: "koa-romerito-1985", name: "Romerito", club: "Fluminense", season: "1985", position: "MEI", secondaryPositions: ["ATA"], overall: 90, attackStyle: "Posse", defenseStyle: "Bloco médio", physical: 88, category: "kingofamerica" },
  { id: "koa-bebeto-1989", name: "Bebeto", club: "Vasco da Gama", season: "1989", position: "ATA", overall: 91, attackStyle: "Contra-ataque", defenseStyle: "Bloco médio", physical: 88, category: "kingofamerica" },
  { id: "koa-rai-1992", name: "Raí", club: "São Paulo", season: "1992", position: "MEI", overall: 92, attackStyle: "Posse", defenseStyle: "Bloco médio", physical: 88, category: "kingofamerica" },
  { id: "koa-cafu-1994", name: "Cafu", club: "São Paulo", season: "1994", position: "LAT", overall: 91, attackStyle: "Cruzamentos", defenseStyle: "Bloco médio", physical: 88, category: "kingofamerica" },
  { id: "koa-romario-2000", name: "Romário", club: "Vasco da Gama", season: "2000", position: "ATA", overall: 91, attackStyle: "Contra-ataque", defenseStyle: "Bloco médio", physical: 88, category: "kingofamerica" },
  { id: "koa-carlostevez-2005", name: "Carlos Tévez", club: "Corinthians", season: "2005", position: "ATA", secondaryPositions: ["MEI"], overall: 91, attackStyle: "Contra-ataque", defenseStyle: "Bloco médio", physical: 88, category: "kingofamerica" },
  { id: "koa-dalessandro-2010", name: "D'Alessandro", club: "Internacional", season: "2010", position: "MEI", overall: 90, attackStyle: "Posse", defenseStyle: "Bloco médio", physical: 88, category: "kingofamerica" },
  { id: "koa-neymar-2011", name: "Neymar", club: "Santos", season: "2011", position: "ATA", secondaryPositions: ["MEI"], overall: 92, attackStyle: "Contra-ataque", defenseStyle: "Bloco médio", physical: 88, category: "kingofamerica" },
  { id: "koa-neymar-2012", name: "Neymar", club: "Santos", season: "2012", position: "ATA", secondaryPositions: ["MEI"], overall: 94, attackStyle: "Contra-ataque", defenseStyle: "Bloco médio", physical: 88, category: "kingofamerica" },
  { id: "koa-ronaldinhogaucho-2013", name: "Ronaldinho Gaúcho", club: "Atlético Mineiro", season: "2013", position: "MEI", secondaryPositions: ["ATA"], overall: 91, attackStyle: "Posse", defenseStyle: "Bloco médio", physical: 88, category: "kingofamerica" },
  { id: "koa-luan-2017", name: "Luan", club: "Grêmio", season: "2017", position: "MEI", secondaryPositions: ["ATA"], overall: 91, attackStyle: "Posse", defenseStyle: "Bloco médio", physical: 88, category: "kingofamerica" },
  { id: "koa-gabigol-2019", name: "Gabigol", club: "Flamengo", season: "2019", position: "ATA", overall: 93, attackStyle: "Contra-ataque", defenseStyle: "Bloco médio", physical: 88, category: "kingofamerica" },
  { id: "koa-marinho-2020", name: "Marinho", club: "Santos", season: "2020", position: "ATA", secondaryPositions: ["MEI"], overall: 90, attackStyle: "Contra-ataque", defenseStyle: "Bloco médio", physical: 88, category: "kingofamerica" },
  { id: "koa-pedro-2022", name: "Pedro", club: "Flamengo", season: "2022", position: "ATA", overall: 91, attackStyle: "Contra-ataque", defenseStyle: "Bloco médio", physical: 88, category: "kingofamerica" },
  { id: "koa-germancano-2023", name: "Germán Cano", club: "Fluminense", season: "2023", position: "ATA", overall: 92, attackStyle: "Contra-ataque", defenseStyle: "Bloco médio", physical: 88, category: "kingofamerica" },
  { id: "koa-luizhenrique-2024", name: "Luiz Henrique", club: "Botafogo", season: "2024", position: "MEI", secondaryPositions: ["ATA"], overall: 92, attackStyle: "Posse", defenseStyle: "Bloco médio", physical: 88, category: "kingofamerica" },
];
