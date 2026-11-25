-- =====================================================================
-- Point mechanics: scoring rules table, full points for manual entries,
-- simpler sleep scoring, achievement points in totals, and rest days.
--
-- Paste this whole file into the Supabase SQL Editor and click Run.
-- Run it once, after the first three files. Safe to run again.
--
-- What it changes:
--   * scoring_rules: one table for the tunable numbers (daily goal,
--     streak minimum, free community limit, rest days per week). Edit
--     them in the Table Editor; no SQL needed.
--   * Typed-in entries now earn full points (no more "manual earns half").
--   * Sleep: 1 point per hour, up to 9 points.
--   * Achievement points now count: they're added to the day you earned
--     the badge, so they show up in today/week/season totals and on
--     every leaderboard.
--   * Rest days: plan one per week (Monday to Sunday) before that week
--     starts. A planned rest day keeps your streak alive.
--   * Your time zone is saved on your profile, so the database knows
--     when your week starts and when the rest-day deadline passes.
--
-- Changing point values recalculates past days too, because points are
-- worked out from the raw amounts whenever they're read.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Tunable numbers (PLACEHOLDERS). Mirrored in src/config/scoring.ts.
-- Re-running this file never overwrites values you've already changed.
-- ---------------------------------------------------------------------
create table if not exists public.scoring_rules (
  key         text primary key,
  value       numeric not null,
  description text not null
);

insert into public.scoring_rules (key, value, description) values
  ('daily_goal',              40, 'Points for a "complete" day'),
  ('streak_min_points',       10, 'Points a day needs to count toward a streak'),
  ('free_community_limit',     1, 'Communities a free user can be in'),
  ('rest_days_per_week',       1, 'Planned rest days per week (Monday to Sunday)'),
  ('rest_day_max_days_ahead', 35, 'How far ahead a rest day can be planned')
on conflict (key) do nothing;

alter table public.scoring_rules enable row level security;
-- Allows anyone signed in to read the rules (they aren't secret). Nobody can change them from the app.
drop policy if exists "scoring_rules: read" on public.scoring_rules;
create policy "scoring_rules: read" on public.scoring_rules for select to authenticated using (true);
grant select on public.scoring_rules to authenticated;

-- Reads one rule. Fails loudly if a rule is missing instead of guessing.
create or replace function public.rule(p_key text) returns numeric
language plpgsql stable set search_path = '' as $$
declare v numeric;
begin
  select value into v from public.scoring_rules where key = p_key;
  if v is null then raise exception 'missing scoring rule %', p_key; end if;
  return v;
end $$;

-- The old fixed-number helpers now read from the table.
create or replace function public.daily_goal() returns int
language sql stable set search_path = '' as $$ select public.rule('daily_goal')::int $$;

create or replace function public.streak_min_points() returns int
language sql stable set search_path = '' as $$ select public.rule('streak_min_points')::int $$;

create or replace function public.free_community_limit() returns int
language sql stable set search_path = '' as $$ select public.rule('free_community_limit')::int $$;

-- ---------------------------------------------------------------------
-- Activity point changes
-- ---------------------------------------------------------------------
-- Typed-in entries earn the same as synced ones (for now).
update public.activity_types set manual_multiplier = 1 where manual_multiplier <> 1;

-- Sleep: 1 point per hour, capped at 9 points.
update public.activity_types set points_per_unit = 1, daily_cap = 9 where key = 'sleep_hours';

-- ---------------------------------------------------------------------
-- Achievement points count toward totals.
-- Each earned badge gets the day it was earned (your local day), and its
-- bonus_points are added to that day's total.
-- ---------------------------------------------------------------------
alter table public.user_achievements add column if not exists day date;
update public.user_achievements
set day = case when period = 'once' then earned_at::date else period::date end
where day is null;
alter table public.user_achievements alter column day set default current_date;
alter table public.user_achievements alter column day set not null;
create index if not exists user_achievements_user_day on public.user_achievements (user_id, day);

-- Total points per user per day = activity points + achievement points.
-- (The first three columns are the same as before; two new ones split the total.)
create or replace view public.daily_points with (security_invoker = true) as
with act as (
  select user_id, day, sum(points)::int as pts
  from public.daily_activity_points
  group by user_id, day
),
bonus as (
  select ua.user_id, ua.day, sum(a.bonus_points)::int as pts
  from public.user_achievements ua
  join public.achievements a on a.key = ua.achievement_key
  group by ua.user_id, ua.day
)
select
  coalesce(act.user_id, bonus.user_id)                as user_id,
  coalesce(act.day, bonus.day)                        as day,
  (coalesce(act.pts, 0) + coalesce(bonus.pts, 0))::int as points,
  coalesce(act.pts, 0)::int                           as activity_points,
  coalesce(bonus.pts, 0)::int                         as bonus_points
from act
full join bonus on bonus.user_id = act.user_id and bonus.day = act.day;

-- ---------------------------------------------------------------------
-- Time zone on the profile (set by the app, checked against Postgres's
-- list of real time zones). Used for "what day is it for this person".
-- ---------------------------------------------------------------------
alter table public.profiles
  add column if not exists time_zone       text not null default 'UTC',
  -- Extra rest days per week on top of the free one (for a future paid plan).
  -- Not editable from the app.
  add column if not exists extra_rest_days int  not null default 0 check (extra_rest_days >= 0);

create or replace function public.set_my_time_zone(p_tz text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  if not exists (select 1 from pg_catalog.pg_timezone_names where name = p_tz) then
    raise exception 'unknown time zone %', p_tz;
  end if;
  update public.profiles set time_zone = p_tz where id = auth.uid();
end $$;

-- Today's date where this person is (not the phone's word for it).
create or replace function public.local_today(p_user uuid) returns date
language sql stable security definer set search_path = '' as $$
  select (now() at time zone coalesce((select time_zone from public.profiles where id = p_user), 'UTC'))::date
$$;

-- ---------------------------------------------------------------------
-- Rest days
-- ---------------------------------------------------------------------
create table if not exists public.rest_days (
  user_id    uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  day        date not null,
  created_at timestamptz not null default now(),
  primary key (user_id, day)
);

alter table public.rest_days enable row level security;
-- Allows people to see only their own rest days. Changes go through plan_rest_day() / cancel_rest_day().
drop policy if exists "rest_days: read own" on public.rest_days;
create policy "rest_days: read own" on public.rest_days for select to authenticated using (user_id = auth.uid());
grant select on public.rest_days to authenticated;

create or replace function public.rest_days_per_week(p_user uuid) returns int
language sql stable security definer set search_path = '' as $$
  select public.rule('rest_days_per_week')::int
         + coalesce((select extra_rest_days from public.profiles where id = p_user), 0)
$$;

-- Plans a rest day. Rules: the day's week (Monday to Sunday) must not have
-- started yet, it can't be too far ahead, and the week can't be full.
create or replace function public.plan_rest_day(p_day date) returns void
language plpgsql security definer set search_path = '' as $$
declare
  uid   uuid := auth.uid();
  today date;
  wk    date := date_trunc('week', p_day)::date;  -- Monday of that week
begin
  if uid is null then raise exception 'not signed in'; end if;
  -- One request at a time per person, so two taps can't both squeeze in.
  perform 1 from public.profiles where id = uid for update;
  today := public.local_today(uid);
  if exists (select 1 from public.rest_days where user_id = uid and day = p_day) then return; end if;
  if wk <= today then raise exception 'rest_day_too_late'; end if;
  if p_day > today + public.rule('rest_day_max_days_ahead')::int then raise exception 'rest_day_too_far'; end if;
  if (select count(*) from public.rest_days where user_id = uid and day between wk and wk + 6)
     >= public.rest_days_per_week(uid) then
    raise exception 'rest_day_week_full';
  end if;
  insert into public.rest_days (user_id, day) values (uid, p_day);
end $$;

-- Cancels a planned rest day, until its week starts.
create or replace function public.cancel_rest_day(p_day date) returns void
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not signed in'; end if;
  if date_trunc('week', p_day)::date <= public.local_today(uid) then raise exception 'rest_day_too_late'; end if;
  delete from public.rest_days where user_id = uid and day = p_day;
end $$;

-- ---------------------------------------------------------------------
-- Streaks, now with rest days. Mirrors src/features/streaks/logic.ts:
-- count back from today (or yesterday, if today isn't done yet). Days with
-- enough points add 1; planned rest days are skipped without breaking
-- the run; any other day ends it.
-- ---------------------------------------------------------------------
create or replace function public.streak_for(p_user uuid, p_today date) returns int
language plpgsql stable security definer set search_path = '' as $$
declare
  good   date[];
  rest   date[];
  d      date := p_today;
  n      int  := 0;
  oldest date;
begin
  select coalesce(array_agg(day), '{}') into good from public.daily_points
  where user_id = p_user and day <= p_today and points >= public.streak_min_points();
  select coalesce(array_agg(day), '{}') into rest from public.rest_days
  where user_id = p_user and day <= p_today;
  select least((select min(x) from unnest(good) x), (select min(x) from unnest(rest) x)) into oldest;
  if oldest is null then return 0; end if;

  if not (d = any (good)) and not (d = any (rest)) then d := d - 1; end if;
  while d >= oldest loop
    if d = any (good) then n := n + 1;
    elsif not (d = any (rest)) then exit;
    end if;
    d := d - 1;
  end loop;
  return n;
end $$;
revoke execute on function public.streak_for(uuid, date) from public, anon, authenticated;

-- Home screen stats, now also saying whether today is a rest day.
create or replace function public.my_stats(p_today date) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not signed in'; end if;
  return jsonb_build_object(
    'today_points',       coalesce((select points from public.daily_points where user_id = uid and day = p_today), 0),
    'today_bonus_points', coalesce((select bonus_points from public.daily_points where user_id = uid and day = p_today), 0),
    'week_points',        coalesce((select sum(points) from public.daily_points where user_id = uid and day between p_today - 6 and p_today), 0),
    'lifetime_points',    coalesce((select sum(points) from public.daily_points where user_id = uid), 0),
    'streak',             public.streak_for(uid, p_today),
    'daily_goal',         public.daily_goal(),
    'rest_day_today',     exists (select 1 from public.rest_days where user_id = uid and day = p_today),
    'rest_days_per_week', public.rest_days_per_week(uid)
  );
end $$;

-- ---------------------------------------------------------------------
-- Achievements: record the day earned, and use total points (activity +
-- achievements) for "Goal crushed" and "High scorer", matching the ring.
-- ---------------------------------------------------------------------
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
      where (select coalesce(sum(points), 0) from public.daily_points where user_id = uid and day = p_today)
            >= public.daily_goal()
    union all select 'hydrated', p_today::text
      where (select coalesce(sum(amount), 0) from today where activity_key = 'water') >= 8
    union all select 'well_rested', p_today::text
      where (select coalesce(sum(amount), 0) from today where activity_key = 'sleep_hours') >= 7
    union all select 'all_rounder', p_today::text
      where (select count(*) from today) >= 4
  ),
  ins as (
    insert into public.user_achievements (user_id, achievement_key, period, day)
    select uid, k, per, p_today from earned
    on conflict do nothing
    returning achievement_key, user_achievements.period
  )
  select a.key, a.title, a.description, a.kind, a.icon, ins.period
  from ins join public.achievements a on a.key = ins.achievement_key;
end $$;

-- ---------------------------------------------------------------------
-- Who can call what
-- ---------------------------------------------------------------------
revoke execute on function public.local_today(uuid) from public, anon, authenticated;
revoke execute on function public.rest_days_per_week(uuid) from public, anon, authenticated;

grant execute on function
  public.rule(text),
  public.daily_goal(),
  public.streak_min_points(),
  public.free_community_limit(),
  public.set_my_time_zone(text),
  public.plan_rest_day(date),
  public.cancel_rest_day(date),
  public.my_stats(date),
  public.evaluate_achievements(date)
to authenticated;
