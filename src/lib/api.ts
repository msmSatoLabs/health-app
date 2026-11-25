/**
 * Every call the app makes to Supabase lives here, so screens stay simple
 * and it is easy to see what the app reads and writes.
 */
import { supabase } from './supabase';
import { addDays, localDay } from './dates';
import type {
  Achievement,
  ActivityLog,
  ActivitySource,
  ActivityType,
  Community,
  CommunityWithCount,
  DailyActivityPoints,
  DailyPoints,
  LeaderboardRow,
  MyStats,
  NewAchievement,
  Profile,
  UserAchievement,
} from './types';

/** Turns database error codes into sentences people can read. */
export function friendlyError(e: unknown): string {
  const msg = e instanceof Error ? e.message : typeof e === 'object' && e && 'message' in e ? String((e as { message: unknown }).message) : String(e);
  if (msg.includes('community_limit_reached'))
    return 'Free accounts can be in one community for now. Joining more will be part of the paid plan.';
  if (msg.includes('invalid_invite_code')) return "That invite code doesn't match any community.";
  if (msg.includes('Invalid login credentials')) return 'Email or password is incorrect.';
  return msg;
}

function check<T>(res: { data: T | null; error: unknown }): T {
  if (res.error) throw res.error;
  return res.data as T;
}

export async function getMyProfile(userId: string): Promise<Profile> {
  return check(await supabase.from('profiles').select('*').eq('id', userId).single());
}

export async function updateDisplayName(userId: string, name: string) {
  check(await supabase.from('profiles').update({ display_name: name.trim() }).eq('id', userId));
}

export async function getActivityTypes(): Promise<ActivityType[]> {
  return check(await supabase.from('activity_types').select('*').order('sort_order'));
}

export async function logActivity(activityKey: string, amount: number, source: ActivitySource = 'manual') {
  check(
    await supabase
      .from('activity_logs')
      .insert({ activity_key: activityKey, amount, source, day: localDay() }),
  );
}

export async function deleteLog(id: string) {
  check(await supabase.from('activity_logs').delete().eq('id', id));
}

export async function syncHealthDay(day: string, totals: Record<string, number>) {
  check(await supabase.rpc('sync_health_day', { p_day: day, p_totals: totals }));
}

export async function getMyStats(): Promise<MyStats> {
  return check(await supabase.rpc('my_stats', { p_today: localDay() }));
}

export async function getTodayBreakdown(): Promise<DailyActivityPoints[]> {
  return check(await supabase.from('daily_activity_points').select('*').eq('day', localDay()));
}

export async function getDailyPoints(days: number): Promise<DailyPoints[]> {
  const today = localDay();
  return check(
    await supabase
      .from('daily_points')
      .select('*')
      .gte('day', addDays(today, -(days - 1)))
      .lte('day', today)
      .order('day'),
  );
}

export async function getRecentLogs(limit = 30): Promise<ActivityLog[]> {
  return check(
    await supabase.from('activity_logs').select('*').order('created_at', { ascending: false }).limit(limit),
  );
}

export async function getHistory(days = 30): Promise<DailyActivityPoints[]> {
  return check(
    await supabase
      .from('daily_activity_points')
      .select('*')
      .gte('day', addDays(localDay(), -(days - 1)))
      .order('day', { ascending: false }),
  );
}

export async function getMyCommunities(): Promise<CommunityWithCount[]> {
  return check(
    await supabase.from('communities').select('*, community_members(count)').order('created_at'),
  );
}

export async function getCommunity(id: string): Promise<CommunityWithCount> {
  return check(
    await supabase.from('communities').select('*, community_members(count)').eq('id', id).single(),
  );
}

export async function createCommunity(name: string): Promise<Community> {
  return check(await supabase.rpc('create_community', { p_name: name }));
}

export async function joinCommunity(code: string): Promise<Community> {
  return check(await supabase.rpc('join_community', { p_code: code }));
}

export async function leaveCommunity(communityId: string, userId: string) {
  check(
    await supabase.from('community_members').delete().eq('community_id', communityId).eq('user_id', userId),
  );
}

export type LeaderboardPeriod = 'today' | 'week';

export async function getLeaderboard(communityId: string, period: LeaderboardPeriod): Promise<LeaderboardRow[]> {
  const today = localDay();
  const from = period === 'today' ? today : addDays(today, -6);
  return check(
    await supabase.rpc('community_leaderboard', { p_community: communityId, p_from: from, p_to: today }),
  );
}

export async function getAchievements(): Promise<Achievement[]> {
  return check(await supabase.from('achievements').select('*').order('sort_order'));
}

export async function getMyAchievements(): Promise<UserAchievement[]> {
  return check(await supabase.from('user_achievements').select('achievement_key, period, earned_at'));
}

/** Checks for newly earned badges. Call after logging or syncing. */
export async function evaluateAchievements(): Promise<NewAchievement[]> {
  return check(await supabase.rpc('evaluate_achievements', { p_today: localDay() }));
}
