import { Player } from "@/types/player";

/**
 * Cartas "Fim de Carreira" — a mesma lenda em sua última grande passagem no
 * futebol brasileiro, com Overall reduzido em relação à versão Lendária/Auge.
 * O nome é sempre IDÊNTICO ao da carta Lendária correspondente — é isso que
 * garante que as duas nunca coexistam na mesma liga (dedup por nome/athleteKey
 * em services/playerRepository.ts), exatamente como qualquer outro atleta com
 * múltiplas cartas no jogo.
 */
export const VETERAN_PLAYERS: Player[] = [
  { id: "veteran-pele-1974", name: "Pelé", club: "Santos", season: "1974", position: "ATA", overall: 85, attackStyle: "Contra-ataque", defenseStyle: "Bloco médio", physical: 78, category: "veteran" },
  { id: "veteran-zico-1989", name: "Zico", club: "Flamengo", season: "1989", position: "MEI", overall: 86, attackStyle: "Posse", defenseStyle: "Bloco médio", physical: 78, category: "veteran" },
  { id: "veteran-garrincha-1966", name: "Garrincha", club: "Corinthians", season: "1966", position: "ATA", overall: 84, attackStyle: "Contra-ataque", defenseStyle: "Bloco médio", physical: 78, category: "veteran" },
  { id: "veteran-romario-2005", name: "Romário", club: "Vasco da Gama", season: "2005", position: "ATA", overall: 86, attackStyle: "Contra-ataque", defenseStyle: "Bloco médio", physical: 78, category: "veteran", athleteKey: "romario" },
  { id: "veteran-ronaldofenomeno-2010", name: "Ronaldo Fenômeno", club: "Corinthians", season: "2010", position: "ATA", overall: 86, attackStyle: "Contra-ataque", defenseStyle: "Bloco médio", physical: 78, category: "veteran", athleteKey: "ronaldofenomeno" },
  { id: "veteran-socrates-1985", name: "Sócrates", club: "Flamengo", season: "1985", position: "MEI", overall: 85, attackStyle: "Posse", defenseStyle: "Bloco médio", physical: 78, category: "veteran" },
  { id: "veteran-ronaldinhogaucho-2014", name: "Ronaldinho Gaúcho", club: "Atlético Mineiro", season: "2014", position: "MEI", overall: 88, attackStyle: "Posse", defenseStyle: "Bloco médio", physical: 78, category: "veteran", athleteKey: "ronaldinhogaucho" },
  { id: "veteran-rivellino-1981", name: "Rivellino", club: "Fluminense", season: "1981", position: "MEI", overall: 84, attackStyle: "Posse", defenseStyle: "Bloco médio", physical: 78, category: "veteran" },
  { id: "veteran-rivaldo-2004", name: "Rivaldo", club: "São Caetano", season: "2004", position: "MEI", overall: 85, attackStyle: "Posse", defenseStyle: "Bloco médio", physical: 78, category: "veteran" },
  { id: "veteran-kaka-2014", name: "Kaká", club: "São Paulo", season: "2014", position: "MEI", overall: 85, attackStyle: "Posse", defenseStyle: "Bloco médio", physical: 78, category: "veteran", athleteKey: "kaka" },
  { id: "veteran-cafu-2005", name: "Cafu", club: "São Paulo", season: "2005", position: "LAT", overall: 85, attackStyle: "Cruzamentos", defenseStyle: "Bloco médio", physical: 78, category: "veteran" },
  { id: "veteran-robertocarlos-2010", name: "Roberto Carlos", club: "Corinthians", season: "2010", position: "LAT", overall: 84, attackStyle: "Cruzamentos", defenseStyle: "Bloco médio", physical: 78, category: "veteran" },
  { id: "veteran-rogerioceni-2015", name: "Rogério Ceni", club: "São Paulo", season: "2015", position: "GOL", overall: 84, attackStyle: "Posse", defenseStyle: "Linha baixa", physical: 78, category: "veteran", athleteKey: "rogerioceni" },
  { id: "veteran-marcos-2011", name: "Marcos", club: "Palmeiras", season: "2011", position: "GOL", overall: 84, attackStyle: "Posse", defenseStyle: "Linha baixa", physical: 78, category: "veteran", athleteKey: "marcos-goleiro" },
  { id: "veteran-tostao-1972", name: "Tostão", club: "Cruzeiro", season: "1972", position: "ATA", overall: 84, attackStyle: "Contra-ataque", defenseStyle: "Bloco médio", physical: 78, category: "veteran" },
  { id: "veteran-falcao-1985", name: "Falcão", club: "São Paulo", season: "1985", position: "MEI", overall: 84, attackStyle: "Posse", defenseStyle: "Bloco médio", physical: 78, category: "veteran" },
  { id: "veteran-junior-1990", name: "Júnior", club: "Flamengo", season: "1990", position: "LAT", overall: 84, attackStyle: "Cruzamentos", defenseStyle: "Bloco médio", physical: 78, category: "veteran" },
  { id: "veteran-juninhopernambucano-2013", name: "Juninho Pernambucano", club: "Vasco da Gama", season: "2013", position: "MEI", overall: 84, attackStyle: "Posse", defenseStyle: "Bloco médio", physical: 78, category: "veteran", athleteKey: "juninhopernambucano" },
  { id: "veteran-dida-2013", name: "Dida", club: "Internacional", season: "2013", position: "GOL", overall: 84, attackStyle: "Posse", defenseStyle: "Linha baixa", physical: 78, category: "veteran" },
  { id: "veteran-ademirdaguia-1980", name: "Ademir da Guia", club: "Palmeiras", season: "1980", position: "MEI", overall: 84, attackStyle: "Posse", defenseStyle: "Bloco médio", physical: 78, category: "veteran" },
  { id: "veteran-leandro-1990", name: "Leandro", club: "Flamengo", season: "1990", position: "LAT", overall: 84, attackStyle: "Cruzamentos", defenseStyle: "Bloco médio", physical: 78, category: "veteran" },
  { id: "veteran-edmundo-2008", name: "Edmundo", club: "Fluminense", season: "2008", position: "ATA", overall: 84, attackStyle: "Contra-ataque", defenseStyle: "Bloco médio", physical: 78, category: "veteran", athleteKey: "edmundo" },
  { id: "veteran-rai-1998", name: "Raí", club: "São Paulo", season: "1998", position: "MEI", overall: 84, attackStyle: "Posse", defenseStyle: "Bloco médio", physical: 78, category: "veteran" },
  { id: "veteran-luizao-2007", name: "Luizão", club: "Palmeiras", season: "2007", position: "ATA", overall: 84, attackStyle: "Contra-ataque", defenseStyle: "Bloco médio", physical: 78, category: "veteran" },
  { id: "veteran-alex-2013", name: "Alex", club: "Coritiba", season: "2013", position: "MEI", overall: 84, attackStyle: "Posse", defenseStyle: "Bloco médio", physical: 78, category: "veteran", athleteKey: "alex" },
  { id: "veteran-diegoribas-2017", name: "Diego Ribas", club: "Flamengo", season: "2017", position: "MEI", overall: 84, attackStyle: "Posse", defenseStyle: "Bloco médio", physical: 78, category: "veteran", athleteKey: "diegoribas" },
  { id: "veteran-marcelinhocarioca-2008", name: "Marcelinho Carioca", club: "Corinthians", season: "2008", position: "MEI", overall: 84, attackStyle: "Posse", defenseStyle: "Bloco médio", physical: 78, category: "veteran", athleteKey: "marcelinhocarioca" },
  { id: "veteran-petkovic-2007", name: "Petkovic", club: "Flamengo", season: "2007", position: "MEI", overall: 84, attackStyle: "Posse", defenseStyle: "Bloco médio", physical: 78, category: "veteran", athleteKey: "petkovic" },
];
