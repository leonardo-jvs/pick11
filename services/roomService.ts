import { Room } from "@/types/room";
import { RoomParticipant, TeamTactics } from "@/types/team";
import { RoomRow, RoomParticipantRow } from "@/types/supabase";
import { ROOM_CONFIG, DEFAULT_TACTICS } from "@/constants/game";
import { FANTASY_CLUB_NAME_SUGGESTIONS } from "@/mocks/clubs";
import { getSupabaseClient } from "@/lib/supabase/client";
import { ensureAnonymousSession } from "@/lib/supabase/auth";

function mapParticipant(row: RoomParticipantRow): RoomParticipant {
  return {
    id: row.user_id,
    name: row.name,
    isHuman: row.is_human,
    isReady: row.is_ready,
    clubName: row.club_name,
    tactics: {
      formation: row.formation as TeamTactics["formation"],
      attackStyle: row.attack_style as TeamTactics["attackStyle"],
      defenseStyle: row.defense_style as TeamTactics["defenseStyle"],
    },
  };
}

function mapRoom(roomRow: RoomRow, participantRows: RoomParticipantRow[]): Room {
  return {
    id: roomRow.id,
    code: roomRow.code,
    status: roomRow.status,
    minPlayers: roomRow.min_players,
    maxPlayers: roomRow.max_players,
    // participantes ordenados por entrada — participants[0] deixa de ser "o host" por convenção;
    // use room.hostId (abaixo) pra saber quem é o admin de verdade.
    participants: participantRows.sort((a, b) => a.joined_at.localeCompare(b.joined_at)).map(mapParticipant),
    draftMode: roomRow.draft_mode,
    gameMode: roomRow.game_mode,
    createdAt: roomRow.created_at,
    hostId: roomRow.host_id,
  };
}

async function fetchParticipants(roomId: string): Promise<RoomParticipantRow[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from("room_participants").select("*").eq("room_id", roomId);
  if (error) throw new Error(error.message);
  return data ?? [];
}

/** Busca a sala + participantes atuais — usado ao entrar no Lobby e ao reconectar após reload. */
export async function fetchRoom(roomId: string): Promise<Room | null> {
  const supabase = getSupabaseClient();
  const { data: roomRow, error } = await supabase.from("rooms").select("*").eq("id", roomId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!roomRow) return null;
  const participants = await fetchParticipants(roomId);
  return mapRoom(roomRow, participants);
}

export async function createRoom(
  hostName: string,
  clubName: string,
  maxPlayers: number,
  draftMode: Room["draftMode"] = "visible",
  gameMode: Room["gameMode"] = "league"
): Promise<Room> {
  const user = await ensureAnonymousSession();
  const supabase = getSupabaseClient();
  const resolvedMax = Math.min(Math.max(maxPlayers, 1), ROOM_CONFIG.MAX_PLAYERS);

  const { data: codeData, error: codeError } = await supabase.rpc("generate_room_code");
  if (codeError) throw new Error(codeError.message);

  const { data: roomRow, error: roomError } = await supabase
    .from("rooms")
    .insert({
      code: codeData as string,
      host_id: user.id,
      min_players: Math.min(ROOM_CONFIG.MIN_PLAYERS, resolvedMax),
      max_players: resolvedMax,
      draft_mode: draftMode,
      game_mode: gameMode,
    })
    .select("*")
    .single();
  if (roomError || !roomRow) throw new Error(roomError?.message ?? "Não foi possível criar a sala.");

  const { data: participantRow, error: participantError } = await supabase
    .from("room_participants")
    .insert({
      room_id: roomRow.id,
      user_id: user.id,
      name: hostName,
      club_name: clubName || FANTASY_CLUB_NAME_SUGGESTIONS[0],
      formation: DEFAULT_TACTICS.formation,
      attack_style: DEFAULT_TACTICS.attackStyle,
      defense_style: DEFAULT_TACTICS.defenseStyle,
    })
    .select("*")
    .single();
  if (participantError || !participantRow) throw new Error(participantError?.message ?? "Não foi possível entrar na sala criada.");

  return mapRoom(roomRow, [participantRow]);
}

export async function joinRoomByCode(code: string, name: string, clubName: string): Promise<Room> {
  if (code.trim().length < 4) {
    throw new Error("Código inválido. Verifique e tente novamente.");
  }

  const user = await ensureAnonymousSession();
  const supabase = getSupabaseClient();

  const { data: roomRow, error: roomError } = await supabase
    .from("rooms")
    .select("*")
    .eq("code", code.trim().toUpperCase())
    .maybeSingle();
  if (roomError) throw new Error(roomError.message);
  if (!roomRow) throw new Error("Sala não encontrada. Confira o código com quem te convidou.");
  if (roomRow.status !== "lobby") throw new Error("Essa sala já começou a competição e não aceita mais jogadores.");

  const existingParticipants = await fetchParticipants(roomRow.id);

  // Reconectando: já sou participante dessa sala, só devolve o estado atual
  const alreadyIn = existingParticipants.find((p) => p.user_id === user.id);
  if (alreadyIn) return mapRoom(roomRow, existingParticipants);

  if (existingParticipants.length >= roomRow.max_players) {
    throw new Error("Essa sala já está cheia.");
  }

  const { data: participantRow, error: participantError } = await supabase
    .from("room_participants")
    .insert({
      room_id: roomRow.id,
      user_id: user.id,
      name,
      club_name: clubName || FANTASY_CLUB_NAME_SUGGESTIONS[randomIndex()],
      formation: DEFAULT_TACTICS.formation,
      attack_style: DEFAULT_TACTICS.attackStyle,
      defense_style: DEFAULT_TACTICS.defenseStyle,
    })
    .select("*")
    .single();
  if (participantError || !participantRow) throw new Error(participantError?.message ?? "Não foi possível entrar na sala.");

  return mapRoom(roomRow, [...existingParticipants, participantRow]);
}

function randomIndex() {
  return Math.floor(Math.random() * FANTASY_CLUB_NAME_SUGGESTIONS.length);
}

/** Atualiza nome do clube e/ou tática do próprio participante. RLS garante que só dá pra alterar a si mesmo. */
export async function updateOwnParticipant(
  roomId: string,
  userId: string,
  patch: { clubName?: string; tactics?: Partial<TeamTactics>; isReady?: boolean }
): Promise<void> {
  const supabase = getSupabaseClient();
  const update: Partial<RoomParticipantRow> = {};
  if (patch.clubName !== undefined) update.club_name = patch.clubName;
  if (patch.tactics?.formation !== undefined) update.formation = patch.tactics.formation;
  if (patch.tactics?.attackStyle !== undefined) update.attack_style = patch.tactics.attackStyle;
  if (patch.tactics?.defenseStyle !== undefined) update.defense_style = patch.tactics.defenseStyle;
  if (patch.isReady !== undefined) update.is_ready = patch.isReady;

  const { error } = await supabase.from("room_participants").update(update).eq("room_id", roomId).eq("user_id", userId);
  if (error) throw new Error(error.message);
}

/**
 * Sai da sala. Se quem saiu era o host, o admin passa automaticamente pra
 * quem entrou há mais tempo (a sala nunca fica "órfã" enquanto tiver gente).
 * Se era o último participante, a sala inteira é encerrada.
 */
export async function leaveRoom(roomId: string, userId: string): Promise<void> {
  const supabase = getSupabaseClient();

  const { data: roomRow } = await supabase.from("rooms").select("*").eq("id", roomId).maybeSingle();
  const { error: deleteError } = await supabase.from("room_participants").delete().eq("room_id", roomId).eq("user_id", userId);
  if (deleteError) throw new Error(deleteError.message);

  if (!roomRow || roomRow.host_id !== userId) return;

  const remaining = await fetchParticipants(roomId);
  if (remaining.length === 0) {
    await supabase.from("rooms").delete().eq("id", roomId);
    return;
  }
  const nextHost = [...remaining].sort((a, b) => a.joined_at.localeCompare(b.joined_at))[0];
  // A troca de host só é permitida pela política de RLS quando feita pelo
  // próprio host atual — como ainda estamos autenticados como ele nesta
  // chamada (a exclusão acima não derruba a sessão), a atualização é válida.
  await supabase.from("rooms").update({ host_id: nextHost.user_id }).eq("id", roomId);
}

/** Só o host pode fechar a sala pra todo mundo — RLS bloqueia qualquer outro usuário. */
export async function closeRoom(roomId: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from("rooms").delete().eq("id", roomId);
  if (error) throw new Error(error.message);
}
