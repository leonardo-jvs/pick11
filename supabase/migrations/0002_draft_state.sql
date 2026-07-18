-- ============================================================================
-- Pick11 — Fase 2 do Multiplayer Online: Draft Sincronizado
-- ============================================================================
-- Pré-requisito: já ter rodado supabase/migrations/0001_rooms_and_lobby.sql
--
-- Como executar: mesmo processo da Fase 1 — SQL Editor -> New query -> colar
-- -> Run (ou `supabase db push` via CLI).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Tabela: draft_states
-- ----------------------------------------------------------------------------
-- Guarda o DraftState inteiro (mesmo formato que o TypeScript já usa) como
-- JSONB — a lógica do Draft (elegibilidade de posição, ordem snake, sorteio
-- de candidatos etc.) continua 100% em services/draftService.ts, sem
-- duplicação em SQL. O Postgres aqui funciona como um "quadro compartilhado"
-- sincronizado, não como um motor de regras.
--
-- turn_version é a trava de concorrência otimista: toda escrita exige saber
-- a versão atual (via `where turn_version = X`). Se dois clientes tentarem
-- escrever ao mesmo tempo (ex: o jogador confirma o pick no exato instante em
-- que o timer zera), só o primeiro consegue — o segundo recebe zero linhas
-- afetadas, descarta sua tentativa e aceita o que chegou por Realtime. Isso
-- evita qualquer duplicação de turno ou "escolha fantasma" sem precisar de
-- lock distribuído.
create table if not exists public.draft_states (
  room_id uuid primary key references public.rooms(id) on delete cascade,
  state jsonb not null,
  turn_version int not null default 0,
  -- momento em que o turno atual expira (now() + 10s a cada novo turno).
  -- É a partir DESTE timestamp, não de um contador local de cada navegador,
  -- que todo cliente calcula quanto tempo falta — elimina divergência de
  -- relógio/latência entre jogadores.
  turn_deadline timestamptz,
  updated_at timestamptz not null default now()
);

comment on table public.draft_states is 'Estado sincronizado do Draft de uma sala — um único DraftState (JSONB) espelhado em tempo real para todos os participantes.';
comment on column public.draft_states.turn_version is 'Trava de concorrência otimista: toda atualização exige o valor atual. Escrita com versão desatualizada é silenciosamente rejeitada (zero linhas afetadas).';

create index if not exists idx_draft_states_room_id on public.draft_states (room_id);

drop trigger if exists trg_draft_states_updated_at on public.draft_states;
create trigger trg_draft_states_updated_at
  before update on public.draft_states
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- Row Level Security
-- ----------------------------------------------------------------------------
alter table public.draft_states enable row level security;

-- select: qualquer participante da sala pode ler o estado do draft
drop policy if exists "draft_states_select_participants" on public.draft_states;
create policy "draft_states_select_participants"
  on public.draft_states for select
  to authenticated
  using (
    exists (
      select 1 from public.room_participants rp
      where rp.room_id = draft_states.room_id and rp.user_id = auth.uid()
    )
  );

-- insert: só o host da sala pode criar o estado inicial (ao iniciar o draft)
drop policy if exists "draft_states_insert_host" on public.draft_states;
create policy "draft_states_insert_host"
  on public.draft_states for insert
  to authenticated
  with check (
    exists (
      select 1 from public.rooms r
      where r.id = draft_states.room_id and r.host_id = auth.uid()
    )
  );

-- update: qualquer participante da sala pode tentar escrever — a proteção
-- real contra corrida é o turn_version (aplicado pelo client via .eq()),
-- não o RLS. RLS aqui só garante que gente de fora da sala não escreve nada.
drop policy if exists "draft_states_update_participants" on public.draft_states;
create policy "draft_states_update_participants"
  on public.draft_states for update
  to authenticated
  using (
    exists (
      select 1 from public.room_participants rp
      where rp.room_id = draft_states.room_id and rp.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.room_participants rp
      where rp.room_id = draft_states.room_id and rp.user_id = auth.uid()
    )
  );

-- ----------------------------------------------------------------------------
-- Realtime
-- ----------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'draft_states'
  ) then
    alter publication supabase_realtime add table public.draft_states;
  end if;
end $$;
