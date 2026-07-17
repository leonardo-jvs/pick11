import { Player } from "@/types/player";

/**
 * Cartas "Lendária" — ídolos históricos, sem vínculo com uma temporada
 * específica. Overall balanceado por camadas de importância histórica:
 * 95-96 lendas absolutas · 92-94 temporadas/carreiras excepcionais ·
 * 89-91 grandes carreiras · 87-88 carreiras muito marcantes.
 */
export const LEGEND_PLAYERS: Player[] = [
  // 95-96 — lendas absolutas
  { id: "legend-pele", name: "Pelé", club: "Santos", position: "ATA", overall: 96, attackStyle: "Posse", defenseStyle: "Pressão alta", physical: 95, category: "legend" },
  { id: "legend-zico", name: "Zico", club: "Flamengo", position: "MEI", secondaryPositions: ["ATA"], overall: 96, attackStyle: "Posse", defenseStyle: "Bloco médio", physical: 92, category: "legend" },
  { id: "legend-garrincha", name: "Garrincha", club: "Botafogo", position: "ATA", secondaryPositions: ["MEI"], overall: 95, attackStyle: "Cruzamentos", defenseStyle: "Pressão alta", physical: 90, category: "legend" },
  { id: "legend-romario", name: "Romário", club: "Vasco da Gama", position: "ATA", overall: 95, attackStyle: "Contra-ataque", defenseStyle: "Pressão alta", physical: 88, category: "legend", athleteKey: "romario" },
  { id: "legend-ronaldofenomeno", name: "Ronaldo Fenômeno", club: "Cruzeiro", position: "ATA", overall: 95, attackStyle: "Contra-ataque", defenseStyle: "Pressão alta", physical: 91, category: "legend", athleteKey: "ronaldofenomeno" },

  // 92-94 — carreiras/temporadas excepcionais
  { id: "legend-socrates", name: "Sócrates", club: "Corinthians", position: "MEI", overall: 94, attackStyle: "Posse", defenseStyle: "Bloco médio", physical: 88, category: "legend" },
  { id: "legend-ronaldinhogaucho", name: "Ronaldinho Gaúcho", club: "Grêmio", position: "MEI", secondaryPositions: ["ATA"], overall: 94, attackStyle: "Posse", defenseStyle: "Bloco médio", physical: 89, category: "legend", athleteKey: "ronaldinhogaucho" },
  { id: "legend-rivellino", name: "Rivellino", club: "Corinthians", position: "MEI", secondaryPositions: ["ATA"], overall: 93, attackStyle: "Cruzamentos", defenseStyle: "Bloco médio", physical: 89, category: "legend" },
  { id: "legend-rivaldo", name: "Rivaldo", club: "Palmeiras", position: "MEI", secondaryPositions: ["ATA"], overall: 93, attackStyle: "Posse", defenseStyle: "Bloco médio", physical: 88, category: "legend" },
  { id: "legend-kaka", name: "Kaká", club: "São Paulo", position: "MEI", secondaryPositions: ["ATA"], overall: 92, attackStyle: "Posse", defenseStyle: "Pressão alta", physical: 87, category: "legend", athleteKey: "kaka" },
  { id: "legend-cafu", name: "Cafu", club: "São Paulo", position: "LAT", overall: 92, attackStyle: "Cruzamentos", defenseStyle: "Pressão alta", physical: 90, category: "legend" },
  { id: "legend-robertocarlos", name: "Roberto Carlos", club: "Palmeiras", position: "LAT", overall: 92, attackStyle: "Cruzamentos", defenseStyle: "Pressão alta", physical: 90, category: "legend" },

  // 89-91 — grandes carreiras
  { id: "legend-rogerioceni", name: "Rogério Ceni", club: "São Paulo", position: "GOL", overall: 91, attackStyle: "Posse", defenseStyle: "Linha baixa", physical: 90, category: "legend", athleteKey: "rogerioceni" },
  { id: "legend-marcos", name: "Marcos", club: "Palmeiras", position: "GOL", overall: 91, attackStyle: "Posse", defenseStyle: "Linha baixa", physical: 89, category: "legend", athleteKey: "marcos-goleiro" },
  { id: "legend-tostao", name: "Tostão", club: "Cruzeiro", position: "ATA", overall: 90, attackStyle: "Posse", defenseStyle: "Bloco médio", physical: 85, category: "legend" },
  { id: "legend-falcao", name: "Falcão", club: "Internacional", position: "MEI", overall: 90, attackStyle: "Posse", defenseStyle: "Bloco médio", physical: 86, category: "legend" },
  { id: "legend-junior", name: "Júnior", club: "Flamengo", position: "LAT", overall: 90, attackStyle: "Cruzamentos", defenseStyle: "Bloco médio", physical: 86, category: "legend" },
  { id: "legend-juninhopernambucano", name: "Juninho Pernambucano", club: "Vasco da Gama", position: "MEI", secondaryPositions: ["VOL"], overall: 90, attackStyle: "Posse", defenseStyle: "Bloco médio", physical: 85, category: "legend", athleteKey: "juninhopernambucano" },
  { id: "legend-dida", name: "Dida", club: "Cruzeiro", position: "GOL", overall: 89, attackStyle: "Posse", defenseStyle: "Linha baixa", physical: 87, category: "legend" },
  { id: "legend-ademirdaguia", name: "Ademir da Guia", club: "Palmeiras", position: "MEI", overall: 89, attackStyle: "Posse", defenseStyle: "Bloco médio", physical: 83, category: "legend" },

  // 87-88 — carreiras muito marcantes
  { id: "legend-leandro", name: "Leandro", club: "Flamengo", position: "LAT", overall: 88, attackStyle: "Cruzamentos", defenseStyle: "Bloco médio", physical: 85, category: "legend" },
  { id: "legend-edmundo", name: "Edmundo", club: "Vasco da Gama", position: "ATA", overall: 88, attackStyle: "Contra-ataque", defenseStyle: "Pressão alta", physical: 84, category: "legend", athleteKey: "edmundo" },
  { id: "legend-rai", name: "Raí", club: "São Paulo", position: "MEI", secondaryPositions: ["ATA"], overall: 88, attackStyle: "Posse", defenseStyle: "Bloco médio", physical: 83, category: "legend" },
  { id: "legend-luizao", name: "Luizão", club: "São Paulo", position: "ATA", overall: 87, attackStyle: "Contra-ataque", defenseStyle: "Pressão alta", physical: 85, category: "legend" },
  { id: "legend-alex", name: "Alex", club: "Cruzeiro", position: "MEI", secondaryPositions: ["ATA"], overall: 87, attackStyle: "Posse", defenseStyle: "Bloco médio", physical: 82, category: "legend", athleteKey: "alex" },
  { id: "legend-diegoribas", name: "Diego Ribas", club: "Flamengo", position: "MEI", secondaryPositions: ["ATA"], overall: 87, attackStyle: "Posse", defenseStyle: "Bloco médio", physical: 84, category: "legend", athleteKey: "diegoribas" },
  { id: "legend-marcelinhocarioca", name: "Marcelinho Carioca", club: "Corinthians", position: "MEI", secondaryPositions: ["ATA"], overall: 87, attackStyle: "Cruzamentos", defenseStyle: "Bloco médio", physical: 81, category: "legend", athleteKey: "marcelinhocarioca" },
  { id: "legend-petkovic", name: "Petkovic", club: "Flamengo", position: "MEI", secondaryPositions: ["ATA"], overall: 87, attackStyle: "Posse", defenseStyle: "Bloco médio", physical: 82, category: "legend", athleteKey: "petkovic" },
];
