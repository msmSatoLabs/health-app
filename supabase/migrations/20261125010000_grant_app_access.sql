-- =====================================================================
-- Grant the app access to the tables and functions it uses.
--
-- Newer Supabase projects no longer give signed-in users access to new
-- tables automatically, so the app got "permission denied". These grants
-- open the door; the Row Level Security policies from the first file
-- still decide which ROWS each person can see or change.
--
-- Safe to run more than once.
-- =====================================================================

grant usage on schema public to anon, authenticated;

-- Read: reference lists, your own data, your communities (rows filtered by RLS).
grant select on
  public.profiles,
  public.activity_types,
  public.achievements,
  public.activity_logs,
  public.communities,
  public.community_members,
  public.user_achievements,
  public.daily_activity_points,
  public.daily_points
to authenticated;

-- Write: log activities, edit your display name, leave a community,
-- delete a community you own. Points tables are never writable.
grant insert, update, delete on public.activity_logs to authenticated;
grant update (display_name) on public.profiles to authenticated;
grant delete on public.communities, public.community_members to authenticated;

-- Functions the app calls, plus the helpers the security rules and views use.
grant execute on function
  public.daily_goal(),
  public.streak_min_points(),
  public.free_community_limit(),
  public.is_member(uuid),
  public.shares_community(uuid),
  public.sync_health_day(date, jsonb),
  public.create_community(text),
  public.join_community(text),
  public.community_leaderboard(uuid, date, date),
  public.my_stats(date),
  public.evaluate_achievements(date)
to authenticated;
