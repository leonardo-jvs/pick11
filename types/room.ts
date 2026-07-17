import { RoomParticipant } from "./team";

export type RoomStatus = "lobby" | "drafting" | "generating" | "in_league" | "finished";

/** visible = Over Visível (padrão) | hidden = Over Oculto — definido pelo admin antes do Draft */
export type DraftMode = "visible" | "hidden";

/** league = temporada completa (38 rodadas) | cup = Copa mata-mata curta */
export type GameMode = "league" | "cup";

export interface Room {
  id: string;
  code: string;
  status: RoomStatus;
  minPlayers: number;
  maxPlayers: number;
  participants: RoomParticipant[];
  draftMode: DraftMode;
  gameMode: GameMode;
  createdAt: string;
}
