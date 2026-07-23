-- ============================================================================
-- Pick11 — Novo modo "X1"
-- ============================================================================
-- Como executar:
--   1. Abra o seu projeto em https://supabase.com/dashboard
--   2. Vá em "SQL Editor" -> "New query"
--   3. Cole este arquivo inteiro e clique em "Run"
--   (ou, se preferir usar a Supabase CLI: `supabase db push`, colocando este
--   arquivo em supabase/migrations/ com o nome que já está aqui)
--
-- Pré-requisito: as migrations 0001 a 0004 já devem ter sido aplicadas.
--
-- O que esta migration faz:
--   Adiciona 'x1' como valor permitido na CHECK constraint de
--   `rooms.game_mode`, que hoje aceita 'league', 'cup' e 'league_knockout'.
--   Nenhum outro campo do banco precisa de mudança — o modo X1 reaproveita
--   inteiramente `competition_states.schedule` (calendário de ida e volta,
--   gerado pela mesma função já usada pela Liga — 2 times sempre produzem
--   exatamente 2 rodadas) e `competition_states.cup_state` (só usado quando
--   o agregado empata, pra guardar o resultado da disputa de pênaltis,
--   reaproveitando a mesma estrutura de qualquer mata-mata do jogo). As duas
--   colunas já existem e já são `jsonb` sem CHECK constraint própria.
--
-- Este arquivo é seguro para rodar mais de uma vez (idempotente).
-- ============================================================================

alter table public.rooms
  drop constraint if exists rooms_game_mode_check;

alter table public.rooms
  add constraint rooms_game_mode_check
  check (game_mode in ('league', 'cup', 'league_knockout', 'x1'));
