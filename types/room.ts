import { RoomParticipant } from "./team";

export type RoomStatus = "lobby" | "drafting" | "generating" | "in_league" | "in_cup" | "finished";

/** visible = Over Visível (padrão) | hidden = Over Oculto — definido pelo admin antes do Draft */
export type DraftMode = "visible" | "hidden";

/** league = temporada completa (38 rodadas) | cup = Copa mata-mata curta | league_knockout = Liga (18 rodadas, 10 times) + mata-mata (semifinal/final) | x1 = confronto direto entre 2 jogadores (ida e volta) */
export type GameMode = "league" | "cup" | "league_knockout" | "x1";

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
  /** user_id (Supabase Auth) de quem administra a sala — só ele pode iniciar/encerrar competição ou fechar a sala. */
  hostId: string;
}
