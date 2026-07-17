import { Player } from "@/types/player";

/**
 * Corinthians — cartas comuns (jogadores atuais do elenco).
 * Overall e estilos são estimativas de gameplay, não oficiais.
 */
export const CORINTHIANS_PLAYERS: Player[] = [
  { id: "com-cor-01", name: "Hugo Souza", club: "Corinthians", position: "GOL", overall: 82, attackStyle: "Posse", defenseStyle: "Linha baixa", physical: 88, category: "common" },
  { id: "com-cor-02", name: "Matheuzinho", club: "Corinthians", position: "LAT", overall: 78, attackStyle: "Cruzamentos", defenseStyle: "Pressão alta", physical: 85, category: "common" },
  { id: "com-cor-03", name: "Fagner", club: "Corinthians", position: "LAT", overall: 79, attackStyle: "Cruzamentos", defenseStyle: "Bloco médio", physical: 80, category: "common", athleteKey: "fagner" },
  { id: "com-cor-04", name: "Félix Torres", club: "Corinthians", position: "ZAG", overall: 81, attackStyle: "Posse", defenseStyle: "Linha baixa", physical: 84, category: "common" },
  { id: "com-cor-05", name: "André Ramalho", club: "Corinthians", position: "ZAG", overall: 78, attackStyle: "Posse", defenseStyle: "Bloco médio", physical: 81, category: "common" },
  { id: "com-cor-06", name: "Raniele", club: "Corinthians", position: "VOL", overall: 80, attackStyle: "Contra-ataque", defenseStyle: "Pressão alta", physical: 86, category: "common" },
  { id: "com-cor-07", name: "Charles", club: "Corinthians", position: "VOL", overall: 78, attackStyle: "Posse", defenseStyle: "Bloco médio", physical: 83, category: "common" },
  { id: "com-cor-08", name: "Rodrigo Garro", club: "Corinthians", position: "MEI", secondaryPositions: ["ATA"], overall: 84, attackStyle: "Posse", defenseStyle: "Pressão alta", physical: 82, category: "common" },
  { id: "com-cor-09", name: "Yuri Alberto", club: "Corinthians", position: "ATA", overall: 83, attackStyle: "Contra-ataque", defenseStyle: "Pressão alta", physical: 85, category: "common" },
  { id: "com-cor-10", name: "Ángel Romero", club: "Corinthians", position: "ATA", secondaryPositions: ["MEI"], overall: 80, attackStyle: "Cruzamentos", defenseStyle: "Bloco médio", physical: 79, category: "common" },
];
