-- ============================================================================
-- Pick11 — Fase 3 do Multiplayer Online: Competição Sincronizada
-- ============================================================================
-- Pré-requisito: já ter rodado 0001_rooms_and_lobby.sql e 0002_draft_state.sql
-- Como executar: mesmo processo das fases anteriores.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Tabela: competition_states
-- ----------------------------------------------------------------------------
-- Mesmo princípio de draft_states: o estado inteiro da competição (elencos,
-- calendário ou grupos/chaveamento da Copa, partidas já disputadas, rodada
-- atual) vive como JSONB, sincronizado via Realtime. A lógica de simulação
-- continua inteiramente em services/leagueService.ts, services/cupService.ts
-- e services/matchPrepService.ts — nada foi duplicado em SQL.
--
-- round_readiness guarda quem já confirmou presença na rodada atual:
-- { [teamId]: { ready: boolean, boost: string } }. Uma rodada só é simulada
-- quando todo mundo confirmou ou o prazo (round_deadline) vence — o que
-- acontecer primeiro. Só o host calcula e grava o resultado (protegido pela
-- mesma trava otimista da Fase 2), todo mundo mais só lê.
create table if not exists public.competition_states (
  room_id uuid primary key references public.rooms(id) on delete cascade,
  teams jsonb not null,
  schedule jsonb,              -- Liga: [{round, homeId, awayId}]
  cup_state jsonb,             -- Copa: CupState inteiro
  matches jsonb not null default '[]'::jsonb,
  current_round int not null default 1,
  phase text not null default 'pre_match' check (phase in ('pre_match', 'finished')),
  round_readiness jsonb not null default '{}'::jsonb,
  round_deadline timestamptz,
  version int not null default 0,
  updated_at timestamptz not null default now()
);

comment on table public.competition_states is 'Estado sincronizado da Liga/Copa de uma sala, depois que o Draft termina.';
comment on column public.competition_states.version is 'Trava de concorrência otimista — mesmo padrão de draft_states.turn_version.';

create index if not exists idx_competition_states_room_id on public.competition_states (room_id);

drop trigger if exists trg_competition_states_updated_at on public.competition_states;
create trigger trg_competition_states_updated_at
  before update on public.competition_states
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- Row Level Security (mesmo padrão de draft_states)
-- ----------------------------------------------------------------------------
alter table public.competition_states enable row level security;

drop policy if exists "competition_states_select_participants" on public.competition_states;
create policy "competition_states_select_participants"
  on public.competition_states for select
  to authenticated
  using (
    exists (
      select 1 from public.room_participants rp
      where rp.room_id = competition_states.room_id and rp.user_id = auth.uid()
    )
  );

drop policy if exists "competition_states_insert_host" on public.competition_states;
create policy "competition_states_insert_host"
  on public.competition_states for insert
  to authenticated
  with check (
    exists (
      select 1 from public.rooms r
      where r.id = competition_states.room_id and r.host_id = auth.uid()
    )
  );

drop policy if exists "competition_states_update_participants" on public.competition_states;
create policy "competition_states_update_participants"
  on public.competition_states for update
  to authenticated
  using (
    exists (
      select 1 from public.room_participants rp
      where rp.room_id = competition_states.room_id and rp.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.room_participants rp
      where rp.room_id = competition_states.room_id and rp.user_id = auth.uid()
    )
  );

-- "Nova Liga": só o host apaga o estado da competição (e do draft) pra
-- recomeçar do zero mantendo a sala e os participantes.
drop policy if exists "competition_states_delete_host" on public.competition_states;
create policy "competition_states_delete_host"
  on public.competition_states for delete
  to authenticated
  using (
    exists (
      select 1 from public.rooms r
      where r.id = competition_states.room_id and r.host_id = auth.uid()
    )
  );

drop policy if exists "draft_states_delete_host" on public.draft_states;
create policy "draft_states_delete_host"
  on public.draft_states for delete
  to authenticated
  using (
    exists (
      select 1 from public.rooms r
      where r.id = draft_states.room_id and r.host_id = auth.uid()
    )
  );

-- ----------------------------------------------------------------------------
-- Realtime
-- ----------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'competition_states'
  ) then
    alter publication supabase_realtime add table public.competition_states;
  end if;
end $$;
