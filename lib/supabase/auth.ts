import { User } from "@supabase/supabase-js";
import { getSupabaseClient } from "@/lib/supabase/client";

/**
 * Garante que o navegador tenha uma sessão do Supabase Auth — anônima, sem
 * pedir login. O supabase-js já persiste essa sessão sozinho (localStorage),
 * então se o usuário já tinha entrado antes, `getSession()` devolve a MESMA
 * pessoa, com o mesmo `user.id` — é exatamente isso que permite reconectar
 * numa sala depois de atualizar a página ou fechar o navegador.
 *
 * Pré-requisito no painel do Supabase: Authentication -> Providers ->
 * habilitar "Anonymous Sign-Ins".
 */
export async function ensureAnonymousSession(): Promise<User> {
  const supabase = getSupabaseClient();

  const { data: existing } = await supabase.auth.getSession();
  if (existing.session?.user) return existing.session.user;

  const { data, error } = await supabase.auth.signInAnonymously();
  if (error || !data.user) {
    throw new Error(
      error?.message ??
        "Não foi possível iniciar sua sessão. Verifique se 'Anonymous Sign-Ins' está habilitado no seu projeto Supabase."
    );
  }
  return data.user;
}

export async function getCurrentUserId(): Promise<string | null> {
  const supabase = getSupabaseClient();
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}
