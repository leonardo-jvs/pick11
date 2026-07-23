-- ============================================================================
-- Pick11 — Novo modo "Liga + Mata-Mata"
-- ============================================================================
-- Como executar:
--   1. Abra o seu projeto em https://supabase.com/dashboard
--   2. Vá em "SQL Editor" -> "New query"
--   3. Cole este arquivo inteiro e clique em "Run"
--   (ou, se preferir usar a Supabase CLI: `supabase db push`, colocando este
--   arquivo em supabase/migrations/ com o nome que já está aqui)
--
-- Pré-requisito: as migrations 0001, 0002 e 0003 já devem ter sido aplicadas.
--
-- O que esta migration faz:
--   Adiciona 'league_knockout' como valor permitido na CHECK constraint de
--   `rooms.game_mode`, que hoje só aceita 'league' e 'cup'. Nenhum outro
--   campo do banco precisa de mudança — o modo "Liga + Mata-Mata" reaproveita
--   inteiramente `competition_states.schedule` (calendário da fase de liga,
--   já gerado dinamicamente conforme a quantidade de times) e
--   `competition_states.cup_state` (chaveamento da semifinal/final, criado
--   dinamicamente ao fim da 18ª rodada) — as duas colunas já existem e já são
--   `jsonb` sem CHECK constraint própria, então nada nelas precisa mudar.
--   `competition_states.phase` também não muda: o novo modo nunca sai de
--   'pre_match' até realmente terminar, igual à Liga e à Copa já fazem.
--
-- Este arquivo é seguro para rodar mais de uma vez (idempotente).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- rooms.game_mode: permite 'league_knockout' além de 'league' e 'cup'
-- ----------------------------------------------------------------------------
-- A constraint original foi criada inline (sem nome explícito) dentro do
-- `create table`, então o Postgres deu a ela o nome padrão
-- "<tabela>_<coluna>_check". Removemos essa e recriamos já com os 3 valores
-- — os dois modos existentes continuam aceitos exatamente como antes, só
-- estamos adicionando o terceiro.
alter table public.rooms
  drop constraint if exists rooms_game_mode_check;

alter table public.rooms
  add constraint rooms_game_mode_check
  check (game_mode in ('league', 'cup', 'league_knockout'));

-- ----------------------------------------------------------------------------
-- Verificação (opcional): confirma que a constraint ficou com os 3 valores.
-- Rode este SELECT manualmente no SQL Editor se quiser conferir — não faz
-- parte da migration em si, é só um jeito rápido de auditar o resultado.
-- ----------------------------------------------------------------------------
-- select conname, pg_get_constraintdef(oid)
-- from pg_constraint
-- where conrelid = 'public.rooms'::regclass and conname = 'rooms_game_mode_check';
