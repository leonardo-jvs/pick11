import { Player } from "@/types/player";

/**
 * Corinthians — cartas comuns (jogadores atuais do elenco).
 * Overall e estilos são estimativas de gameplay, não oficiais.
 */
export const CORINTHIANS_PLAYERS: Player[] = [
  { id: "com-cor-01", name: "Hugo Souza", club: "Corinthians", position: "GOL", overall: 82, attackStyle: "Posse", defenseStyle: "Linha baixa", physical: 88, category: "common", season: "2025" },
  { id: "com-cor-04", name: "Félix Torres", club: "Corinthians", position: "ZAG", overall: 81, attackStyle: "Posse", defenseStyle: "Linha baixa", physical: 84, category: "common", season: "2025" },
  { id: "com-cor-06", name: "Raniele", club: "Corinthians", position: "VOL", overall: 80, attackStyle: "Contra-ataque", defenseStyle: "Pressão alta", physical: 86, category: "common", season: "2025" },
  { id: "com-cor-08", name: "Rodrigo Garro", club: "Corinthians", position: "MEI", secondaryPositions: ["ATA"], overall: 84, attackStyle: "Posse", defenseStyle: "Pressão alta", physical: 82, category: "common", season: "2025" },
  { id: "com-cor-09", name: "Yuri Alberto", club: "Corinthians", position: "ATA", overall: 83, attackStyle: "Contra-ataque", defenseStyle: "Pressão alta", physical: 85, category: "common", season: "2025" },
  { id: "com-cor-10", name: "Ángel Romero", club: "Corinthians", position: "ATA", secondaryPositions: ["MEI"], overall: 80, attackStyle: "Cruzamentos", defenseStyle: "Bloco médio", physical: 79, category: "common", season: "2025" },
];
