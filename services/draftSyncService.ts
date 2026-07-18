import { DraftState } from "@/types/draft";
import { Room } from "@/types/room";
import { getSupabaseClient } from "@/lib/supabase/client";
import { initDraft } from "@/services/draftService";
import { DRAFT_CONFIG } from "@/constants/game";

export interface DraftSyncSnapshot {
  state: DraftState;
  version: number;
  deadline: string | null;
}

function computeDeadline(state: DraftState): string | null {
  if (state.isComplete) return null;
  return new Date(Date.now() + DRAFT_CONFIG.PICK_TIMER_SECONDS * 1000).toISOString();
}

/**
 * Só o host chama isso — cria o estado inicial do Draft (reaproveitando
 * initDraft(), a mesma função pura de sempre) e publica no Supabase. Todo
 * mundo mais vê isso chegar via Realtime e navega pro Draft junto.
 */
export async function startDraftOnServer(room: Room): Promise<void> {
  const supabase = getSupabaseClient();
  const humans = room.participants.filter((p) => p.isHuman);
  const initialState = await initDraft(room.id, humans);

  const { error: insertError } = await supabase.from("draft_states").insert({
    room_id: room.id,
    state: initialState,
    turn_version: 0,
    turn_deadline: computeDeadline(initialState),
  });
  if (insertError) throw new Error(insertError.message);

  const { error: statusError } = await supabase.from("rooms").update({ status: "drafting" }).eq("id", room.id);
  if (statusError) throw new Error(statusError.message);
}

/** Busca o estado atual do Draft — usado ao entrar na tela e ao reconectar após reload. */
export async function fetchDraftState(roomId: string): Promise<DraftSyncSnapshot | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from("draft_states").select("*").eq("room_id", roomId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return { state: data.state as DraftState, version: data.turn_version, deadline: data.turn_deadline };
}

/**
 * Escreve o próximo estado do Draft com trava de concorrência otimista: só
 * aplica se `expectedVersion` ainda for a versão atual no banco. Devolve
 * `true` se a escrita foi aceita, `false` se alguém mais rápido já tinha
 * avançado o turno primeiro (nesse caso, não é um erro — o chamador deve só
 * descartar sua tentativa local e aceitar o estado que chegar via Realtime).
 */
export async function submitDraftState(roomId: string, expectedVersion: number, nextState: DraftState): Promise<boolean> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("draft_states")
    .update({
      state: nextState,
      turn_version: expectedVersion + 1,
      turn_deadline: computeDeadline(nextState),
    })
    .eq("room_id", roomId)
    .eq("turn_version", expectedVersion)
    .select("turn_version");

  if (error) throw new Error(error.message);
  return (data?.length ?? 0) > 0;
}
