-- Quizlet clone: first migration (Supabase Postgres)
-- Access rules: Postgres row level security (RLS). All times timestamptz (UTC).

create extension if not exists pg_trgm;

-- profiles: 1-1 with auth.users (Supabase Auth owns email/password)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique check (char_length(username) between 3 and 30),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table study_sets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  description text not null default '',
  visibility text not null default 'private'
    check (visibility in ('private','link','public')),
  share_token text unique,               -- for 'link' visibility
  card_count int not null default 0,
  last_studied_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on study_sets (user_id, updated_at desc);
create index on study_sets using gin (title gin_trgm_ops);

create table cards (
  id uuid primary key default gen_random_uuid(),
  set_id uuid not null references study_sets(id) on delete cascade,
  position int not null,
  term text not null default '',
  definition text not null default '',
  image_path text,                        -- Supabase Storage path
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cards_position_unique unique (set_id, position) deferrable initially deferred
);
create index on cards (set_id, position);

create table card_progress (
  user_id uuid not null references profiles(id) on delete cascade,
  card_id uuid not null references cards(id) on delete cascade,
  correct_streak int not null default 0,  -- Learn: mastered at 2
  times_seen int not null default 0,
  starred boolean not null default false,
  mastery text not null default 'new' check (mastery in ('new','learning','mastered')),
  last_seen_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, card_id)
);
create index on card_progress (card_id);

create table study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  set_id uuid not null references study_sets(id) on delete cascade,
  mode text not null check (mode in ('flashcards','learn','test','match')),
  config jsonb not null default '{}',     -- test: {question_count, question_types[]}
  state jsonb not null default '{}',      -- learn: current round queue, for resume
  score int,
  total int,
  duration_ms int check (duration_ms >= 0),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on study_sessions (user_id, set_id, mode, started_at desc);
create index on study_sessions (set_id);
-- Match leaderboard per user: best finished time
create index on study_sessions (set_id, duration_ms) where mode = 'match' and finished_at is not null;

-- Per-user study state that the app keeps as small JSON blobs:
-- learn = unfinished Learn sessions by set id, match_best = best Match time (ms) by set id.
create table user_state (
  user_id uuid primary key references profiles(id) on delete cascade,
  learn jsonb not null default '{}',
  match_best jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

-- Create a profile row for every new auth user.
create function handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id) values (new.id);
  insert into user_state (user_id) values (new.id);
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function handle_new_user();

-- updated_at trigger
create function touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
create trigger t_profiles before update on profiles for each row execute function touch_updated_at();
create trigger t_sets before update on study_sets for each row execute function touch_updated_at();
create trigger t_cards before update on cards for each row execute function touch_updated_at();
create trigger t_progress before update on card_progress for each row execute function touch_updated_at();
create trigger t_sessions before update on study_sessions for each row execute function touch_updated_at();
create trigger t_user_state before update on user_state for each row execute function touch_updated_at();

-- card_count maintenance
create function sync_card_count() returns trigger language plpgsql as $$
begin
  update study_sets set card_count = (select count(*) from cards where set_id = coalesce(new.set_id, old.set_id))
  where id = coalesce(new.set_id, old.set_id);
  return null;
end $$;
create trigger t_card_count after insert or delete on cards for each row execute function sync_card_count();

-- RLS
alter table profiles enable row level security;
alter table study_sets enable row level security;
alter table cards enable row level security;
alter table card_progress enable row level security;
alter table study_sessions enable row level security;
alter table user_state enable row level security;

create policy "own profile read" on profiles for select using (auth.uid() = id);
create policy "own profile" on profiles for update using (auth.uid() = id);

-- 'link' sets are read through a server route that checks share_token with the service role,
-- so anon select only sees public ones.
create policy "read sets" on study_sets for select
  using (user_id = auth.uid() or visibility = 'public');
create policy "write own sets" on study_sets for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "read cards" on cards for select using (
  exists (select 1 from study_sets s where s.id = set_id
          and (s.user_id = auth.uid() or s.visibility = 'public')));
create policy "write own cards" on cards for all using (
  exists (select 1 from study_sets s where s.id = set_id and s.user_id = auth.uid()))
  with check (
  exists (select 1 from study_sets s where s.id = set_id and s.user_id = auth.uid()));

create policy "own progress" on card_progress for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own sessions" on study_sessions for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own state" on user_state for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
