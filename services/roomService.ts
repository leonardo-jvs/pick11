import { Room, RoomStatus } from "@/types/room";
import { RoomParticipant, TeamTactics } from "@/types/team";
import { ROOM_CONFIG } from "@/constants/game";
import { DEFAULT_TACTICS, FORMATIONS, PLAY_STYLES } from "@/constants/game";
import { FANTASY_CLUB_NAME_SUGGESTIONS } from "@/mocks/clubs";
import { pickRandomNames } from "@/mocks/participantNames";
import { delay, generateId, randomBetween } from "@/lib/delay";

function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 5 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

function randomTactics(): TeamTactics {
  return {
    formation: FORMATIONS[randomBetween(0, FORMATIONS.length - 1)],
    attackStyle: PLAY_STYLES.attack[randomBetween(0, PLAY_STYLES.attack.length - 1)],
    defenseStyle: PLAY_STYLES.defense[randomBetween(0, PLAY_STYLES.defense.length - 1)],
  };
}

export function createHostParticipant(name: string, clubName: string): RoomParticipant {
  return {
    id: generateId("host"),
    name,
    isHuman: true,
    isReady: false,
    clubName: clubName || FANTASY_CLUB_NAME_SUGGESTIONS[0],
    tactics: { ...DEFAULT_TACTICS },
  };
}

export async function createRoom(hostName: string, clubName: string, maxPlayers: number): Promise<Room> {
  await delay(500);
  const host = createHostParticipant(hostName, clubName);
  const resolvedMax = Math.min(Math.max(maxPlayers, 1), ROOM_CONFIG.MAX_PLAYERS);
  return {
    id: generateId("room"),
    code: generateRoomCode(),
    status: "lobby",
    minPlayers: Math.min(ROOM_CONFIG.MIN_PLAYERS, resolvedMax),
    maxPlayers: resolvedMax,
    participants: [host],
    createdAt: new Date().toISOString(),
  };
}

/** Entrar em uma sala via código — mock: sempre "encontra" uma sala com alguns participantes já dentro */
export async function joinRoomByCode(code: string, name: string, clubName: string): Promise<Room> {
  await delay(700);

  if (code.trim().length < 4) {
    throw new Error("Código inválido. Verifique e tente novamente.");
  }

  const existingCount = randomBetween(1, 4);
  const existingNames = pickRandomNames(existingCount);
  const existing: RoomParticipant[] = existingNames.map((n, i) => ({
    id: generateId(`p${i}`),
    name: n,
    isHuman: true,
    isReady: i === 0,
    clubName: FANTASY_CLUB_NAME_SUGGESTIONS[i % FANTASY_CLUB_NAME_SUGGESTIONS.length],
    tactics: randomTactics(),
  }));

  const self = createHostParticipant(name, clubName);

  return {
    id: generateId("room"),
    code: code.toUpperCase(),
    status: "lobby",
    minPlayers: ROOM_CONFIG.MIN_PLAYERS,
    maxPlayers: ROOM_CONFIG.MAX_PLAYERS,
    participants: [...existing, self],
    createdAt: new Date().toISOString(),
  };
}

/** Gera o próximo participante fictício "entrando" na sala — usado pelo store para simular multiplayer real */
export function generateMockJoiningParticipant(exclude: string[]): RoomParticipant | null {
  const [name] = pickRandomNames(1, exclude);
  if (!name) return null;
  return {
    id: generateId("p"),
    name,
    isHuman: true,
    isReady: false,
    clubName: FANTASY_CLUB_NAME_SUGGESTIONS[randomBetween(0, FANTASY_CLUB_NAME_SUGGESTIONS.length - 1)],
    tactics: randomTactics(),
  };
}

export function updateRoomStatus(room: Room, status: RoomStatus): Room {
  return { ...room, status };
}
