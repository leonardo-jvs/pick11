import { Player, AttackStyle, DefenseStyle } from "./player";

export type Formation = "4-3-3" | "4-4-2";

export type { AttackStyle, DefenseStyle };

export interface TeamTactics {
  formation: Formation;
  attackStyle: AttackStyle;
  defenseStyle: DefenseStyle;
}

export type Boost = "Nenhum" | "Bicho" | "Jogo importante" | "Recuperação rápida" | "Poupar elenco";

export interface RoomParticipant {
  id: string;
  name: string;
  isHuman: boolean;
  isReady: boolean;
  clubName: string;
  tactics: TeamTactics;
}

export interface Team {
  id: string;
  ownerId: string;
  ownerName: string;
  clubName: string;
  isHuman: boolean;
  tactics: TeamTactics;
  starters: Player[]; // 11 titulares (draftados ou sorteados para bots)
  reserves: Player[]; // reservas geradas automaticamente pela IA
  squad: Player[]; // starters + reserves, mantido para telas que listam o elenco completo
  overall: number;
  compatibilityStars: 1 | 2 | 3;
  physical: number;
}
