/**
 * Every call the app makes to Supabase lives here, so screens stay simple
 * and it is easy to see what the app reads and writes.
 */
import { restDayReasonText, weekStart } from '../features/rest-days/logic';
import { supabase } from './supabase';
import { addDays, localDay, seasonRange } from './dates';
import type {
  Achievement,
  ActivityLog,
  ActivitySource,
  ActivityType,
  Community,
  CommunityWithCount,
  DailyActivityPoints,
  DailyPoints,
  FeedEvent,
  LeaderboardRow,
  MemberProfile,
  MyStats,
  NewAchievement,
  Profile,
  ProfileUpdate,
  RestDay,
  UserAchievement,
} from './types';

/** Turns database error codes into sentences people can read. */
export function friendlyError(e: unknown): string {
  const msg = e instanceof Error ? e.message : typeof e === 'object' && e && 'message' in e ? String((e as { message: unknown }).message) : String(e);
  if (msg.includes('community_limit_reached'))
    return 'Free accounts can be in one community for now. Joining more will be part of the paid plan.';
  if (msg.includes('invalid_invite_code')) return "That invite code doesn't match any community.";
  if (msg.includes('rest_day_too_late')) return restDayReasonText('too_late');
  if (msg.includes('rest_day_too_far')) return restDayReasonText('too_far');
  if (msg.includes('rest_day_week_full')) return restDayReasonText('week_full');
  if (msg.includes('Invalid login credentials')) return 'Email or password is incorrect.';
  if (msg.includes('current_password_wrong')) return 'Your current password is incorrect.';
  if (/token has expired or is invalid|otp.*(expired|invalid)/i.test(msg))
    return 'That code is wrong or has expired. Check the newest email, or send a new code.';
  if (/rate limit|only request this after|too many/i.test(msg))
    return 'Too many tries for now. Wait a minute, then try again.';
  if (/should be different from the old/i.test(msg)) return 'Pick a password different from your current one.';
  if (/Could not find the function|does not exist|schema cache|Bucket not found/i.test(msg))
    return 'The database needs an update: run npm run db:push on your computer (see SETUP.md).';
  return msg;
}

function check<T>(res: { data: T | null; error: unknown }): T {
  if (res.error) throw res.error;
  return res.data as T;
}

export async function getMyProfile(userId: string): Promise<Profile> {
  return check(await supabase.from('profiles').select('*').eq('id', userId).single());
}

export async function updateProfile(userId: string, patch: ProfileUpdate) {
  check(await supabase.from('profiles').update(patch).eq('id', userId));
}

const AVATAR_BUCKET = 'avatars';

/** Uploads a profile photo (JPEG bytes) into the user's own folder and saves its link. */
export async function uploadAvatar(userId: string, jpeg: Uint8Array) {
  const path = `${userId}/${Date.now()}.jpg`;
  check(
    await supabase.storage.from(AVATAR_BUCKET).upload(path, jpeg, { contentType: 'image/jpeg', upsert: false }),
  );
  const { publicUrl } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path).data;
  await updateProfile(userId, { avatar_url: publicUrl });
  await removeOldAvatars(userId, path);
}

/** Removes the profile photo and its files. */
export async function removeAvatar(userId: string) {
  await updateProfile(userId, { avatar_url: null });
  await removeOldAvatars(userId, null);
}

async function removeOldAvatars(userId: string, keepPath: string | null) {
  const files = check(await supabase.storage.from(AVATAR_BUCKET).list(userId));
  const old = files.map((f) => `${userId}/${f.name}`).filter((p) => p !== keepPath);
  if (old.length) check(await supabase.storage.from(AVATAR_BUCKET).remove(old));
}

// ---------------------------------------------------------------------------
// Passwords and account

/**
 * Emails a reset code to this address. Supabase sends it even when signed out.
 * For security it doesn't say whether the email has an account.
 */
export async function requestPasswordReset(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
  if (error) throw error;
}

/** Checks the emailed code. On success the person is signed in, so the new password can be saved. */
export async function verifyResetCode(email: string, code: string) {
  const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token: code, type: 'recovery' });
  if (error) throw error;
}

/** Saves a new password for the signed-in person (after verifyResetCode). */
export async function setNewPassword(newPassword: string) {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

/** Changes the password from Settings after checking the current one. */
export async function changePassword(email: string, currentPassword: string, newPassword: string) {
  const { error: checkError } = await supabase.auth.signInWithPassword({ email, password: currentPassword });
  if (checkError) throw new Error('current_password_wrong');
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

/**
 * Permanently deletes the signed-in account and its data (see the delete_account
 * migration). The profile photo is removed first, since the database can't delete Storage files.
 */
export async function deleteMyAccount(userId: string) {
  await removeOldAvatars(userId, null);
  check(await supabase.rpc('delete_my_account'));
  // The account no longer exists, so only clear the session saved on this phone.
  await supabase.auth.signOut({ scope: 'local' });
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

/** Every day with points, oldest first (used for the year and season views). */
export async function getAllDailyPoints(): Promise<DailyPoints[]> {
  return check(await supabase.from('daily_points').select('*').lte('day', localDay()).order('day'));
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

/** 'today', 'week', or a season as 'YYYY-MM'. */
export type LeaderboardPeriod = 'today' | 'week' | `${number}-${number}`;

export async function getLeaderboard(communityId: string, period: LeaderboardPeriod): Promise<LeaderboardRow[]> {
  const today = localDay();
  const [from, to] =
    period === 'today' ? [today, today] : period === 'week' ? [addDays(today, -6), today] : seasonRange(period, today);
  return check(await supabase.rpc('community_leaderboard', { p_community: communityId, p_from: from, p_to: to }));
}

export async function getFeed(communityId: string, limit = 20): Promise<FeedEvent[]> {
  return check(await supabase.rpc('community_feed', { p_community: communityId, p_limit: limit }));
}

export async function getMemberProfile(userId: string): Promise<MemberProfile> {
  return check(await supabase.rpc('member_profile', { p_user: userId, p_today: localDay() }));
}

/**
 * Calls onChange whenever someone in one of these communities logs something.
 * Uses Supabase Realtime; returns a function that stops listening.
 */
export function subscribeToCommunities(communityIds: string[], onChange: () => void): () => void {
  if (communityIds.length === 0) return () => {};
  const channel = supabase.channel(`communities:${communityIds.join(',')}:${Date.now()}`);
  for (const id of communityIds) {
    channel.on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'community_events', filter: `community_id=eq.${id}` },
      onChange,
    );
  }
  channel.subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}

export async function getAchievements(): Promise<Achievement[]> {
  return check(await supabase.from('achievements').select('*').order('sort_order'));
}

export async function getMyAchievements(): Promise<UserAchievement[]> {
  return check(
    await supabase.from('user_achievements').select('achievement_key, period, earned_at').order('earned_at'),
  );
}

/** Saves the phone's time zone, so the database knows when your day and week start. */
export async function setMyTimeZone(timeZone: string) {
  check(await supabase.rpc('set_my_time_zone', { p_tz: timeZone }));
}

/** Your rest days from the start of this week onward. */
export async function getMyRestDays(): Promise<RestDay[]> {
  return check(
    await supabase
      .from('rest_days')
      .select('day, created_at')
      .gte('day', weekStart(localDay()))
      .order('day'),
  );
}

/** Plans a rest day. The database checks the deadline and the weekly limit. */
export async function planRestDay(day: string) {
  check(await supabase.rpc('plan_rest_day', { p_day: day }));
}

export async function cancelRestDay(day: string) {
  check(await supabase.rpc('cancel_rest_day', { p_day: day }));
}

/** Checks for newly earned badges. Call after logging or syncing. */
export async function evaluateAchievements(): Promise<NewAchievement[]> {
  return check(await supabase.rpc('evaluate_achievements', { p_today: localDay() }));
}
