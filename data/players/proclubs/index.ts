import { Player } from "@/types/player";

/**
 * "Posições: VOL / MC" no documento de referência = VOL no Pick11 (VOL já
 * qualifica para qualquer slot MC nas duas formações, então não precisa de
 * posição secundária). "Posição: ME" (Houdini) não existe como posição real
 * no motor do jogo — usamos MEI, que é justamente a posição que ocupa
 * automaticamente um slot MC em qualquer formação quando não existe ME.
 */
export const PROCLUBS_PLAYERS: Player[] = [
  {
    id: "proclubs-zdeppay",
    name: "zDeppay",
    club: "Pro Clubs",
    position: "VOL",
    overall: 90,
    attackStyle: "Posse",
    defenseStyle: "Pressão alta",
    physical: 88,
    category: "proclubs",
  },
  {
    id: "proclubs-respect",
    name: "Respect",
    club: "Pro Clubs",
    position: "VOL",
    overall: 90,
    attackStyle: "Contra-ataque",
    defenseStyle: "Bloco médio",
    physical: 87,
    category: "proclubs",
  },
  {
    id: "proclubs-zpitheuzin",
    name: "zPitheuzin",
    club: "Pro Clubs",
    position: "ATA",
    overall: 90,
    attackStyle: "Contra-ataque",
    defenseStyle: "Pressão alta",
    physical: 89,
    category: "proclubs",
  },
  {
    id: "proclubs-simplymat",
    name: "Simply Mat",
    club: "Pro Clubs",
    position: "ATA",
    overall: 90,
    attackStyle: "Cruzamentos",
    defenseStyle: "Bloco médio",
    physical: 88,
    category: "proclubs",
  },
  {
    id: "proclubs-zbiel",
    name: "zBiel",
    club: "Pro Clubs",
    position: "ZAG",
    overall: 90,
    attackStyle: "Posse",
    defenseStyle: "Linha baixa",
    physical: 87,
    category: "proclubs",
  },
  {
    id: "proclubs-houdini",
    name: "Houdini",
    club: "Pro Clubs",
    position: "MEI",
    overall: 90,
    attackStyle: "Posse",
    defenseStyle: "Bloco médio",
    physical: 86,
    category: "proclubs",
  },
  {
    id: "proclubs-houston",
    name: "Houston",
    club: "Pro Clubs",
    position: "VOL",
    overall: 90,
    attackStyle: "Posse",
    defenseStyle: "Pressão alta",
    physical: 88,
    category: "proclubs",
  },
];
