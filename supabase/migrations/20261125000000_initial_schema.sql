-- =====================================================================
-- Health app: first database schema
--
-- How to run it: open your Supabase project, go to "SQL Editor",
-- paste this whole file, and press "Run". It only needs to run once.
--
-- Plain-language overview:
--   profiles            one row per user (name, premium flag)
--   activity_types      the list of activities and their point rules
--   activity_logs       every activity a user logs (raw amounts, not points)
--   daily_* views       turn raw amounts into points, with daily caps
--   communities         private friend groups with an invite code
--   community_members   who is in which community
--   achievements        badges you can earn (once, or once per day)
--
-- Points are always calculated here in the database, never in the app,
-- so nobody can give themselves extra points by changing the app.
-- All values marked PLACEHOLDER are meant to be tuned later.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Tunable settings (PLACEHOLDER values). Change the number and re-run
-- just that function to adjust.
-- ---------------------------------------------------------------------
create or replace function public.daily_goal() returns int
language sql immutable as $$ select 40 $$;            -- points for a "complete" day

create or replace function public.streak_min_points() returns int
language sql immutable as $$ select 10 $$;            -- points a day needs to keep a streak

create or replace function public.free_community_limit() returns int
language sql immutable as $$ select 1 $$;             -- communities a free user can be in

-- ---------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------
create table public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 40),
  is_premium   boolean not null default false,
  created_at   timestamptz not null default now()
);

-- Create a profile automatically whenever someone signs up.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    left(coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
                  split_part(new.email, '@', 1), 'Player'), 40)
  );
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- Activity types and their point rules (PLACEHOLDER values)
--   points_per_unit   points for 1 unit (e.g. 0.001 per step = 1 per 1,000 steps)
--   daily_cap         most points this activity can earn in one day
--   manual_multiplier when a phone-synced activity is typed in by hand
--                     instead, it earns this fraction (0.5 = half)
--   max_per_entry     biggest single entry allowed (blocks extremes/typos)
-- ---------------------------------------------------------------------
create table public.activity_types (
  key               text primary key,
  label             text not null,
  unit              text not null,
  source            text not null check (source in ('health', 'manual')),
  points_per_unit   numeric not null check (points_per_unit > 0),
  daily_cap         int not null check (daily_cap > 0),
  manual_multiplier numeric not null default 1 check (manual_multiplier between 0 and 1),
  max_per_entry     numeric not null check (max_per_entry > 0),
  icon              text not null,
  sort_order        int not null default 0
);

insert into public.activity_types
  (key, label, unit, source, points_per_unit, daily_cap, manual_multiplier, max_per_entry, icon, sort_order)
values
  -- Synced from Apple Health (typing them in by hand earns half)
  ('steps',           'Steps',           'steps',   'health', 0.001, 10, 0.5, 60000, 'walk',  10),
  ('workout_minutes', 'Workout',         'minutes', 'health', 0.2,   12, 0.5, 240,   'gym',   20),
  ('sleep_hours',     'Sleep',           'hours',   'health', 2,     16, 0.5, 14,    'moon',  30),
  ('active_calories', 'Calories',        'kcal',    'health', 0.02,  10, 0.5, 3000,  'flame', 40),
  -- Always logged by hand (lower caps, since nothing verifies them)
  ('water',           'Water',           'glasses', 'manual', 1,     6,  1,   12,    'drop',  50),
  ('meals',           'Healthy meal',    'meals',   'manual', 2,     6,  1,   3,     'bowl',  60),
  ('study_minutes',   'Study',           'minutes', 'manual', 0.1,   8,  1,   480,   'book',  70),
  ('social',          'Hangout',         'hangouts','manual', 4,     8,  1,   3,     'users', 80);

-- ---------------------------------------------------------------------
-- Activity logs: raw amounts. Points are worked out by the views below.
-- ---------------------------------------------------------------------
create table public.activity_logs (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  activity_key text not null references public.activity_types (key),
  source       text not null check (source in ('health', 'manual')),
  amount       numeric not null check (amount > 0),
  day          date not null,   -- the user's local calendar day
  created_at   timestamptz not null default now()
);

create index activity_logs_user_day on public.activity_logs (user_id, day);
-- Apple Health sync keeps one running total per activity per day.
create unique index activity_logs_one_health_row
  on public.activity_logs (user_id, activity_key, day) where source = 'health';

-- Basic sanity checks on every entry.
create or replace function public.check_activity_log() returns trigger
language plpgsql set search_path = '' as $$
declare t public.activity_types;
begin
  select * into t from public.activity_types where key = new.activity_key;
  if new.source = 'health' and t.source <> 'health' then
    raise exception 'activity % cannot come from Apple Health', new.activity_key;
  end if;
  if new.amount > t.max_per_entry then
    raise exception 'amount too large for %', t.label;
  end if;
  -- Allow a little slack around "today" for time zones; no back-filling old days.
  if new.day < current_date - 2 or new.day > current_date + 1 then
    raise exception 'you can only log activities for today or yesterday';
  end if;
  return new;
end $$;

create trigger activity_logs_check
  before insert or update on public.activity_logs
  for each row execute function public.check_activity_log();

-- Points per user, per day, per activity (with the daily cap applied).
create view public.daily_activity_points with (security_invoker = true) as
select
  l.user_id,
  l.day,
  l.activity_key,
  sum(l.amount) as amount,
  least(
    t.daily_cap,
    floor(sum(l.amount * t.points_per_unit
              * case when l.source = 'manual' then t.manual_multiplier else 1 end))
  )::int as points
from public.activity_logs l
join public.activity_types t on t.key = l.activity_key
group by l.user_id, l.day, l.activity_key, t.daily_cap;

-- Total points per user per day.
create view public.daily_points with (security_invoker = true) as
select user_id, day, sum(points)::int as points
from public.daily_activity_points
group by user_id, day;

-- Save one day of Apple Health totals (replaces that day's earlier sync).
create or replace function public.sync_health_day(p_day date, p_totals jsonb) returns void
language plpgsql set search_path = '' as $$
declare k text; v numeric;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  for k, v in select key, value::numeric from jsonb_each_text(p_totals) loop
    if v is null or v <= 0 then continue; end if;
    insert into public.activity_logs (user_id, activity_key, source, amount, day)
    values (auth.uid(), k, 'health', v, p_day)
    on conflict (user_id, activity_key, day) where source = 'health'
    do update set amount = excluded.amount, created_at = now();
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- Communities
-- ---------------------------------------------------------------------
create table public.communities (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(trim(name)) between 2 and 40),
  invite_code text not null unique,
  created_by  uuid not null references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now()
);

create table public.community_members (
  community_id uuid not null references public.communities (id) on delete cascade,
  user_id      uuid not null references public.profiles (id) on delete cascade,
  role         text not null default 'member' check (role in ('owner', 'member')),
  joined_at    timestamptz not null default now(),
  primary key (community_id, user_id)
);
create index community_members_user on public.community_members (user_id);

-- Helpers used by the security rules below.
create or replace function public.is_member(p_community uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.community_members
                 where community_id = p_community and user_id = auth.uid())
$$;

create or replace function public.shares_community(p_user uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.community_members a
                 join public.community_members b on b.community_id = a.community_id
                 where a.user_id = auth.uid() and b.user_id = p_user)
$$;

-- Throws if the current user is already at their community limit.
create or replace function public.assert_can_join_community() returns void
language plpgsql stable security definer set search_path = '' as $$
declare n int; premium boolean;
begin
  select count(*) into n from public.community_members where user_id = auth.uid();
  select is_premium into premium from public.profiles where id = auth.uid();
  if not coalesce(premium, false) and n >= public.free_community_limit() then
    raise exception 'community_limit_reached';
  end if;
end $$;

create or replace function public.create_community(p_name text) returns public.communities
language plpgsql security definer set search_path = '' as $$
declare
  c public.communities;
  code text;
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- no 0/O/1/I
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  perform public.assert_can_join_community();
  loop
    code := '';
    for i in 1..6 loop
      code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.communities where invite_code = code);
  end loop;
  insert into public.communities (name, invite_code, created_by)
  values (trim(p_name), code, auth.uid()) returning * into c;
  insert into public.community_members (community_id, user_id, role)
  values (c.id, auth.uid(), 'owner');
  return c;
end $$;

create or replace function public.join_community(p_code text) returns public.communities
language plpgsql security definer set search_path = '' as $$
declare c public.communities;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  select * into c from public.communities where invite_code = upper(trim(p_code));
  if c.id is null then raise exception 'invalid_invite_code'; end if;
  if exists (select 1 from public.community_members
             where community_id = c.id and user_id = auth.uid()) then
    return c;  -- already a member
  end if;
  perform public.assert_can_join_community();
  insert into public.community_members (community_id, user_id) values (c.id, auth.uid());
  return c;
end $$;

-- Leaderboard for one community between two days (inclusive).
create or replace function public.community_leaderboard(p_community uuid, p_from date, p_to date)
returns table (user_id uuid, display_name text, points int, rank int)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_member(p_community) then raise exception 'not a member'; end if;
  return query
  select m.user_id, p.display_name,
         coalesce(sum(dp.points), 0)::int as points,
         (rank() over (order by coalesce(sum(dp.points), 0) desc))::int as rank
  from public.community_members m
  join public.profiles p on p.id = m.user_id
  left join public.daily_points dp
         on dp.user_id = m.user_id and dp.day between p_from and p_to
  where m.community_id = p_community
  group by m.user_id, p.display_name
  order by 3 desc, 2;
end $$;

-- ---------------------------------------------------------------------
-- Streaks and stats
-- ---------------------------------------------------------------------
-- Consecutive days (ending today or yesterday) with enough points.
create or replace function public.streak_for(p_user uuid, p_today date) returns int
language sql stable security definer set search_path = '' as $$
  with d as (
    select day from public.daily_points
    where user_id = p_user and day <= p_today and points >= public.streak_min_points()
  ),
  g as (select day, day + (row_number() over (order by day desc))::int as grp from d)
  select case
    when (select max(day) from d) >= p_today - 1
      then (select count(*) from g where grp = (select grp from g order by day desc limit 1))::int
    else 0
  end
$$;

-- Everything the home screen needs in one call. p_today is the phone's local date.
create or replace function public.my_stats(p_today date) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not signed in'; end if;
  return jsonb_build_object(
    'today_points',    coalesce((select points from public.daily_points where user_id = uid and day = p_today), 0),
    'week_points',     coalesce((select sum(points) from public.daily_points where user_id = uid and day between p_today - 6 and p_today), 0),
    'lifetime_points', coalesce((select sum(points) from public.daily_points where user_id = uid), 0),
    'streak',          public.streak_for(uid, p_today),
    'daily_goal',      public.daily_goal()
  );
end $$;

-- ---------------------------------------------------------------------
-- Achievements
-- ---------------------------------------------------------------------
create table public.achievements (
  key         text primary key,
  title       text not null,
  description text not null,
  kind        text not null check (kind in ('once', 'daily')),
  icon        text not null,
  sort_order  int not null default 0
);

insert into public.achievements (key, title, description, kind, icon, sort_order) values
  ('first_log',   'First step',    'Log your first activity',                    'once',  'star',     10),
  ('team_player', 'Team player',   'Join or create a community',                 'once',  'users',    20),
  ('streak_3',    'Warming up',    'Keep a 3-day streak',                        'once',  'flame',    30),
  ('streak_7',    'On a roll',     'Keep a 7-day streak',                        'once',  'flame',    40),
  ('points_500',  'High scorer',   'Earn 500 points in total',                   'once',  'trophy',   50),
  ('daily_goal',  'Goal crushed',  'Hit your daily points goal',                 'daily', 'target',   60),
  ('hydrated',    'Hydrated',      'Drink 8 glasses of water in a day',          'daily', 'drop',     70),
  ('well_rested', 'Well rested',   'Sleep 7 hours or more',                      'daily', 'moon',     80),
  ('all_rounder', 'All-rounder',   'Log 4 different activities in one day',      'daily', 'mountain', 90);

create table public.user_achievements (
  user_id         uuid not null references public.profiles (id) on delete cascade,
  achievement_key text not null references public.achievements (key),
  period          text not null,  -- 'once', or the day (YYYY-MM-DD) for daily ones
  earned_at       timestamptz not null default now(),
  primary key (user_id, achievement_key, period)
);

-- Checks every achievement for the current user and returns the newly earned ones.
create or replace function public.evaluate_achievements(p_today date)
returns table (key text, title text, description text, kind text, icon text, period text)
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not signed in'; end if;
  return query
  with today as (
    select activity_key, amount, points from public.daily_activity_points
    where user_id = uid and day = p_today
  ),
  earned (k, per) as (
    select 'first_log'::text, 'once'::text
      where exists (select 1 from public.activity_logs where user_id = uid)
    union all select 'team_player', 'once'
      where exists (select 1 from public.community_members where user_id = uid)
    union all select 'streak_3', 'once' where public.streak_for(uid, p_today) >= 3
    union all select 'streak_7', 'once' where public.streak_for(uid, p_today) >= 7
    union all select 'points_500', 'once'
      where (select coalesce(sum(points), 0) from public.daily_points where user_id = uid) >= 500
    union all select 'daily_goal', p_today::text
      where (select coalesce(sum(points), 0) from today) >= public.daily_goal()
    union all select 'hydrated', p_today::text
      where (select coalesce(sum(amount), 0) from today where activity_key = 'water') >= 8
    union all select 'well_rested', p_today::text
      where (select coalesce(sum(amount), 0) from today where activity_key = 'sleep_hours') >= 7
    union all select 'all_rounder', p_today::text
      where (select count(*) from today) >= 4
  ),
  ins as (
    insert into public.user_achievements (user_id, achievement_key, period)
    select uid, k, per from earned
    on conflict do nothing
    returning achievement_key, user_achievements.period
  )
  select a.key, a.title, a.description, a.kind, a.icon, ins.period
  from ins join public.achievements a on a.key = ins.achievement_key;
end $$;

-- ---------------------------------------------------------------------
-- Security rules (Row Level Security): who can read and change what.
-- With RLS on, nothing is allowed unless a policy below says so.
-- ---------------------------------------------------------------------
alter table public.profiles          enable row level security;
alter table public.activity_types    enable row level security;
alter table public.activity_logs     enable row level security;
alter table public.communities       enable row level security;
alter table public.community_members enable row level security;
alter table public.achievements      enable row level security;
alter table public.user_achievements enable row level security;

-- Profiles: see yourself and people in your communities; edit only your name.
create policy "profiles: read self and community mates" on public.profiles
  for select to authenticated using (id = auth.uid() or public.shares_community(id));
create policy "profiles: update self" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
revoke update on public.profiles from anon, authenticated;
grant update (display_name) on public.profiles to authenticated;

-- Reference lists anyone signed in can read.
create policy "activity_types: read" on public.activity_types for select to authenticated using (true);
create policy "achievements: read"   on public.achievements   for select to authenticated using (true);

-- Activity logs: only your own. Friends see totals through the leaderboard, not your raw logs.
create policy "logs: read own"   on public.activity_logs for select to authenticated using (user_id = auth.uid());
create policy "logs: add own"    on public.activity_logs for insert to authenticated with check (user_id = auth.uid());
create policy "logs: update own health sync" on public.activity_logs for update to authenticated
  using (user_id = auth.uid() and source = 'health') with check (user_id = auth.uid() and source = 'health');
create policy "logs: delete own manual" on public.activity_logs for delete to authenticated
  using (user_id = auth.uid() and source = 'manual');

-- Communities: visible to members. Created/joined only through the functions above.
create policy "communities: members read" on public.communities
  for select to authenticated using (public.is_member(id));
create policy "communities: owner deletes" on public.communities
  for delete to authenticated using (created_by = auth.uid());
create policy "members: read own communities" on public.community_members
  for select to authenticated using (public.is_member(community_id));
create policy "members: leave" on public.community_members
  for delete to authenticated using (user_id = auth.uid());

create policy "user_achievements: read own" on public.user_achievements
  for select to authenticated using (user_id = auth.uid());

-- Internal helpers are not callable from the app.
revoke execute on function public.streak_for(uuid, date) from public, anon, authenticated;
revoke execute on function public.assert_can_join_community() from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
