/**
 * Tipos das linhas do banco Supabase — escritos à mão espelhando
 * supabase/migrations/0001_rooms_and_lobby.sql. Se o schema mudar, atualizar
 * aqui junto (idealmente também rodando `supabase gen types typescript` num
 * projeto real e comparando).
 */

export interface RoomRow {
  id: string;
  code: string;
  host_id: string;
  status: "lobby" | "drafting" | "generating" | "in_league" | "in_cup" | "finished";
  min_players: number;
  max_players: number;
  draft_mode: "visible" | "hidden";
  game_mode: "league" | "cup";
  created_at: string;
  updated_at: string;
}

export interface RoomParticipantRow {
  id: string;
  room_id: string;
  user_id: string;
  name: string;
  club_name: string;
  is_human: boolean;
  is_ready: boolean;
  formation: string;
  attack_style: string;
  defense_style: string;
  joined_at: string;
  updated_at: string;
}

export interface DraftStateRow {
  room_id: string;
  state: unknown; // DraftState (types/draft.ts), guardado como JSONB
  turn_version: number;
  turn_deadline: string | null;
  updated_at: string;
}

export interface CompetitionStateRow {
  room_id: string;
  teams: unknown; // Team[]
  schedule: unknown | null; // {round,homeId,awayId}[] — Liga
  cup_state: unknown | null; // CupState — Copa
  matches: unknown; // Match[]
  current_round: number;
  phase: "pre_match" | "finished";
  round_readiness: Record<string, { ready: boolean; boost: string }>;
  round_deadline: string | null;
  version: number;
  updated_at: string;
}
