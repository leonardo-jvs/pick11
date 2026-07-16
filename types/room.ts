import { RoomParticipant } from "./team";

export type RoomStatus = "lobby" | "drafting" | "generating" | "in_league" | "finished";

export interface Room {
  id: string;
  code: string;
  status: RoomStatus;
  minPlayers: number;
  maxPlayers: number;
  participants: RoomParticipant[];
  createdAt: string;
}
