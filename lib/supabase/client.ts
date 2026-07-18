import { createClient, SupabaseClient } from "@supabase/supabase-js";

/**
 * Cliente único do Supabase para o navegador. Criado sob demanda (não no
 * carregamento do módulo) porque as variáveis de ambiente só existem no
 * cliente depois do build do Next — e pra dar um erro claro se faltar
 * configurar o .env.local, em vez de falhar silenciosamente mais tarde.
 *
 * Nota: não usamos o genérico `Database` do supabase-js aqui de propósito.
 * Esse tipo é normalmente gerado rodando `supabase gen types typescript`
 * contra um projeto Supabase real — algo que não temos como fazer neste
 * ambiente. Os tipos das linhas (RoomRow, RoomParticipantRow) continuam
 * fortemente tipados em types/supabase.ts e são aplicados manualmente nas
 * funções de services/roomService.ts. Depois de criar seu projeto, rodar
 * `supabase gen types typescript --project-id SEU_ID > types/supabase-generated.ts`
 * é o próximo passo recomendado para tipagem 100% automática.
 */
let client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (client) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Supabase não configurado. Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY no seu .env.local (veja .env.local.example)."
    );
  }

  client = createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  });

  return client;
}
