-- ============================================================================
-- Pick11 — Fase 1 do Multiplayer Online: Salas + Lobby
-- ============================================================================
-- Como executar:
--   1. Abra o seu projeto em https://supabase.com/dashboard
--   2. Vá em "SQL Editor" -> "New query"
--   3. Cole este arquivo inteiro e clique em "Run"
--   (ou, se preferir usar a Supabase CLI: `supabase db push`, colocando este
--   arquivo em supabase/migrations/ com o nome que já está aqui)
--
-- Este arquivo é idempotente onde possível (usa "if not exists"), mas foi
-- pensado para rodar uma única vez, num projeto novo.
-- ============================================================================

-- Extensão necessária para gen_random_uuid()
create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- Tabela: rooms
-- ----------------------------------------------------------------------------
create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  host_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'lobby'
    check (status in ('lobby', 'drafting', 'generating', 'in_league', 'in_cup', 'finished')),
  min_players int not null default 2,
  max_players int not null default 8,
  draft_mode text not null default 'visible' check (draft_mode in ('visible', 'hidden')),
  game_mode text not null default 'league' check (game_mode in ('league', 'cup')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.rooms is 'Uma sala de Pick11 — Liga ou Copa, multiplayer.';
comment on column public.rooms.host_id is 'auth.users.id de quem criou a sala. Só o host pode iniciar/encerrar a competição ou fechar a sala.';

-- ----------------------------------------------------------------------------
-- Tabela: room_participants
-- ----------------------------------------------------------------------------
create table if not exists public.room_participants (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  club_name text not null,
  is_human boolean not null default true,
  is_ready boolean not null default false,
  formation text not null default '4-3-3',
  attack_style text not null default 'Posse',
  defense_style text not null default 'Bloco médio',
  joined_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (room_id, user_id)
);

comment on table public.room_participants is 'Cada linha é um jogador humano dentro de uma sala. user_id vem da sessão anônima do Supabase Auth — é o que permite reconectar depois de atualizar a página.';

-- ----------------------------------------------------------------------------
-- Índices
-- ----------------------------------------------------------------------------
create index if not exists idx_rooms_code on public.rooms (code);
create index if not exists idx_room_participants_room_id on public.room_participants (room_id);
create index if not exists idx_room_participants_user_id on public.room_participants (user_id);

-- ----------------------------------------------------------------------------
-- updated_at automático
-- ----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_rooms_updated_at on public.rooms;
create trigger trg_rooms_updated_at
  before update on public.rooms
  for each row execute function public.set_updated_at();

drop trigger if exists trg_room_participants_updated_at on public.room_participants;
create trigger trg_room_participants_updated_at
  before update on public.room_participants
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- Geração de código único de sala (5 caracteres, sem letras/números
-- ambíguos — mesmo alfabeto que o frontend já usava)
-- ----------------------------------------------------------------------------
create or replace function public.generate_room_code()
returns text
language plpgsql
as $$
declare
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text;
  attempt int := 0;
begin
  loop
    result := '';
    for i in 1..5 loop
      result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    end loop;
    attempt := attempt + 1;
    exit when not exists (select 1 from public.rooms where code = result) or attempt > 20;
  end loop;
  return result;
end;
$$;

grant execute on function public.generate_room_code() to authenticated;

-- ----------------------------------------------------------------------------
-- Row Level Security
-- ----------------------------------------------------------------------------
alter table public.rooms enable row level security;
alter table public.room_participants enable row level security;

-- rooms: qualquer usuário autenticado (inclusive anônimo) pode ler —
-- necessário para localizar uma sala por código antes de entrar nela.
drop policy if exists "rooms_select_authenticated" on public.rooms;
create policy "rooms_select_authenticated"
  on public.rooms for select
  to authenticated
  using (true);

-- rooms: só pode criar uma sala em que host_id = o próprio usuário
drop policy if exists "rooms_insert_own" on public.rooms;
create policy "rooms_insert_own"
  on public.rooms for insert
  to authenticated
  with check (host_id = auth.uid());

-- rooms: só quem é host ATUALMENTE pode atualizar a sala — inclui o caso de
-- transferir a administração pra outro jogador (por isso o "with check" não
-- exige que host_id continue sendo o autor da mudança depois do update).
drop policy if exists "rooms_update_host_only" on public.rooms;
create policy "rooms_update_host_only"
  on public.rooms for update
  to authenticated
  using (host_id = auth.uid())
  with check (true);

-- rooms: só o host pode fechar (apagar) a sala
drop policy if exists "rooms_delete_host_only" on public.rooms;
create policy "rooms_delete_host_only"
  on public.rooms for delete
  to authenticated
  using (host_id = auth.uid());

-- room_participants: qualquer autenticado lê — todo mundo na sala precisa
-- ver todo mundo (lobby, draft, etc.)
drop policy if exists "participants_select_authenticated" on public.room_participants;
create policy "participants_select_authenticated"
  on public.room_participants for select
  to authenticated
  using (true);

-- room_participants: só pode inserir a si mesmo (entrar na sala como você mesmo)
drop policy if exists "participants_insert_own" on public.room_participants;
create policy "participants_insert_own"
  on public.room_participants for insert
  to authenticated
  with check (user_id = auth.uid());

-- room_participants: só pode alterar a própria linha (nome do clube, tática, pronto)
drop policy if exists "participants_update_own" on public.room_participants;
create policy "participants_update_own"
  on public.room_participants for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- room_participants: pode sair sozinho, OU o host da sala pode remover alguém
drop policy if exists "participants_delete_own_or_host" on public.room_participants;
create policy "participants_delete_own_or_host"
  on public.room_participants for delete
  to authenticated
  using (
    user_id = auth.uid()
    or auth.uid() = (select host_id from public.rooms where rooms.id = room_participants.room_id)
  );

-- ----------------------------------------------------------------------------
-- Realtime: habilita a replicação de mudanças dessas tabelas pros clientes
-- inscritos (Supabase Realtime -> Postgres Changes). Feito com checagem pra
-- não dar erro se você rodar esse script mais de uma vez.
-- ----------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'rooms'
  ) then
    alter publication supabase_realtime add table public.rooms;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'room_participants'
  ) then
    alter publication supabase_realtime add table public.room_participants;
  end if;
end $$;
