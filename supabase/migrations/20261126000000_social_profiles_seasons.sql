-- =====================================================================
-- Profiles, privacy, live activity feed, member profiles, seasons.
--
-- Paste this whole file into the Supabase SQL Editor and click Run.
-- Run it once, after the first two files.
--
-- What it adds:
--   * profile photo (avatar) storage and an avatar_url on profiles
--   * privacy settings: hide your streak, achievements, or specific
--     activities from people in your communities
--   * community_events: a small "Alex logged Water" feed that the app
--     listens to live, so leaderboards update the moment someone logs
--   * member_profile(): what a community mate can see about you
--   * achievement point values (shown in the app; not added to scores yet)
--   * leaderboards now include avatars
-- =====================================================================

-- ---------------------------------------------------------------------
-- Profile photo and privacy settings
-- ---------------------------------------------------------------------
alter table public.profiles
  add column if not exists avatar_url         text,
  add column if not exists share_streak       boolean not null default true,
  add column if not exists share_achievements boolean not null default true,
  add column if not exists hidden_activities  text[]  not null default '{}';

-- People can edit only these profile columns (never is_premium).
revoke update on public.profiles from anon, authenticated;
grant update (display_name, avatar_url, share_streak, share_achievements, hidden_activities)
  on public.profiles to authenticated;

-- ---------------------------------------------------------------------
-- Photo storage: a bucket called "avatars". Each person uploads only
-- into a folder named after their own user id. Photos are public links
-- (with random file names), which is how most apps serve profile photos.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

-- Allows signed-in users to upload a photo into their own folder only.
drop policy if exists "avatars: upload own" on storage.objects;
create policy "avatars: upload own" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
-- Allows signed-in users to replace photos in their own folder only.
drop policy if exists "avatars: update own" on storage.objects;
create policy "avatars: update own" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
-- Allows signed-in users to delete photos in their own folder only.
drop policy if exists "avatars: delete own" on storage.objects;
create policy "avatars: delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
-- Allows signed-in users to list their own folder (needed to replace or delete old photos).
drop policy if exists "avatars: read own" on storage.objects;
create policy "avatars: read own" on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------------------------------------------------------------------
-- Achievement point values (PLACEHOLDERS). Shown on badges for now.
-- ---------------------------------------------------------------------
alter table public.achievements add column if not exists bonus_points int not null default 0;
update public.achievements set bonus_points = v.pts
from (values ('first_log', 5), ('team_player', 10), ('streak_3', 15), ('streak_7', 30),
             ('points_500', 25), ('daily_goal', 5), ('hydrated', 2), ('well_rested', 2),
             ('all_rounder', 3)) as v(k, pts)
where key = v.k;

-- ---------------------------------------------------------------------
-- Live feed: one row per community each time a member logs something.
-- The app subscribes to new rows (Supabase Realtime) and refreshes the
-- leaderboard. activity_key is left empty when that member hides the
-- activity, so the feed only says "earned points".
-- ---------------------------------------------------------------------
create table if not exists public.community_events (
  id           bigint generated always as identity primary key,
  community_id uuid not null references public.communities (id) on delete cascade,
  user_id      uuid not null references public.profiles (id) on delete cascade,
  activity_key text references public.activity_types (key),
  created_at   timestamptz not null default now()
);
create index if not exists community_events_recent on public.community_events (community_id, created_at desc);

alter table public.community_events enable row level security;
-- Allows members of a community to see that community's feed.
drop policy if exists "events: members read" on public.community_events;
create policy "events: members read" on public.community_events
  for select to authenticated using (public.is_member(community_id));
grant select on public.community_events to authenticated;

-- Writes feed rows when someone logs or syncs. Runs as the database owner,
-- because people can't write to the feed directly.
create or replace function public.post_community_event() returns trigger
language plpgsql security definer set search_path = '' as $$
declare hidden text[];
begin
  if tg_op = 'UPDATE' and new.amount <= old.amount then return new; end if;  -- only new progress
  select hidden_activities into hidden from public.profiles where id = new.user_id;
  insert into public.community_events (community_id, user_id, activity_key)
  select m.community_id, new.user_id,
         case when new.activity_key = any (coalesce(hidden, '{}')) then null else new.activity_key end
  from public.community_members m where m.user_id = new.user_id;
  -- Keep the feed small: drop events older than 30 days.
  delete from public.community_events
  where created_at < now() - interval '30 days'
    and community_id in (select community_id from public.community_members where user_id = new.user_id);
  return new;
end $$;
revoke execute on function public.post_community_event() from public, anon, authenticated;

drop trigger if exists activity_logs_post_event on public.activity_logs;
create trigger activity_logs_post_event
  after insert or update on public.activity_logs
  for each row execute function public.post_community_event();

-- Turn on live updates for the feed (safe to run twice).
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables
                     where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'community_events') then
    alter publication supabase_realtime add table public.community_events;
  end if;
end $$;

-- Recent feed with names and photos (members only).
create or replace function public.community_feed(p_community uuid, p_limit int default 20)
returns table (id bigint, user_id uuid, display_name text, avatar_url text, activity_key text, created_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_member(p_community) then raise exception 'not a member'; end if;
  return query
  select e.id, e.user_id, p.display_name, p.avatar_url, e.activity_key, e.created_at
  from public.community_events e join public.profiles p on p.id = e.user_id
  where e.community_id = p_community
  order by e.created_at desc
  limit least(greatest(p_limit, 1), 50);
end $$;

-- ---------------------------------------------------------------------
-- Leaderboard, now with avatars. (The return shape changed, so the old
-- version is dropped first.)
-- ---------------------------------------------------------------------
drop function if exists public.community_leaderboard(uuid, date, date);
create function public.community_leaderboard(p_community uuid, p_from date, p_to date)
returns table (user_id uuid, display_name text, avatar_url text, points int, rank int)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_member(p_community) then raise exception 'not a member'; end if;
  return query
  select m.user_id, p.display_name, p.avatar_url,
         coalesce(sum(dp.points), 0)::int as points,
         (rank() over (order by coalesce(sum(dp.points), 0) desc))::int as rank
  from public.community_members m
  join public.profiles p on p.id = m.user_id
  left join public.daily_points dp
         on dp.user_id = m.user_id and dp.day between p_from and p_to
  where m.community_id = p_community
  group by m.user_id, p.display_name, p.avatar_url
  order by 4 desc, 2;
end $$;

-- ---------------------------------------------------------------------
-- What a community mate can see when they tap your name.
-- Points are always shown (they're on the leaderboard anyway); streak,
-- achievements and each activity follow your privacy settings.
-- ---------------------------------------------------------------------
create or replace function public.member_profile(p_user uuid, p_today date) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare p public.profiles;
begin
  if auth.uid() is null then raise exception 'not signed in'; end if;
  if p_user <> auth.uid() and not public.shares_community(p_user) then raise exception 'not a member'; end if;
  select * into p from public.profiles where id = p_user;
  return jsonb_build_object(
    'user_id',      p.id,
    'display_name', p.display_name,
    'avatar_url',   p.avatar_url,
    'week_points',  coalesce((select sum(points) from public.daily_points
                              where user_id = p_user and day between p_today - 6 and p_today), 0),
    'season_points', coalesce((select sum(points) from public.daily_points
                               where user_id = p_user and day >= date_trunc('month', p_today)::date and day <= p_today), 0),
    'streak',       case when p.share_streak then public.streak_for(p_user, p_today) end,
    'achievements', case when p.share_achievements then coalesce((
                       select jsonb_agg(jsonb_build_object('key', a.key, 'title', a.title, 'icon', a.icon,
                                                           'times', x.times, 'last_earned', x.last_earned)
                                        order by a.sort_order)
                       from (select achievement_key, count(*)::int as times, max(earned_at) as last_earned
                             from public.user_achievements where user_id = p_user group by achievement_key) x
                       join public.achievements a on a.key = x.achievement_key), '[]'::jsonb) end,
    'activities',   coalesce((
                       select jsonb_agg(jsonb_build_object('activity_key', d.activity_key, 'amount', d.amount,
                                                           'points', d.points) order by d.points desc)
                       from (select activity_key, sum(amount) as amount, sum(points)::int as points
                             from public.daily_activity_points
                             where user_id = p_user and day between p_today - 6 and p_today
                               and not (activity_key = any (p.hidden_activities))
                             group by activity_key) d), '[]'::jsonb)
  );
end $$;

-- ---------------------------------------------------------------------
-- Let the app call the new functions.
-- ---------------------------------------------------------------------
grant execute on function
  public.community_feed(uuid, int),
  public.community_leaderboard(uuid, date, date),
  public.member_profile(uuid, date)
to authenticated;
