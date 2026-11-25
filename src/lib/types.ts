// Shapes of the data that comes back from Supabase.
// They mirror supabase/migrations/*.sql; update both together.

export type ActivitySource = 'health' | 'manual';

export type ActivityType = {
  key: string;
  label: string;
  unit: string;
  source: ActivitySource;
  points_per_unit: number;
  daily_cap: number;
  manual_multiplier: number;
  max_per_entry: number;
  icon: string;
  sort_order: number;
};

export type ActivityLog = {
  id: string;
  user_id: string;
  activity_key: string;
  source: ActivitySource;
  amount: number;
  day: string;
  created_at: string;
};

export type DailyActivityPoints = {
  user_id: string;
  day: string;
  activity_key: string;
  amount: number;
  points: number;
};

/** points = activity_points (capped) + bonus_points (achievements earned that day). */
export type DailyPoints = { user_id: string; day: string; points: number; activity_points: number; bonus_points: number };

export type Profile = {
  id: string;
  display_name: string;
  is_premium: boolean;
  created_at: string;
  avatar_url: string | null;
  share_streak: boolean;
  share_achievements: boolean;
  hidden_activities: string[];
  /** IANA time zone, e.g. America/Los_Angeles. Kept in sync by the app. */
  time_zone: string;
  /** Extra rest days per week (future paid plan). Not editable from the app. */
  extra_rest_days: number;
};

/** Profile fields people can change themselves (see the grant in the SQL). */
export type ProfileUpdate = Partial<Pick<Profile, 'display_name' | 'avatar_url' | 'share_streak' | 'share_achievements' | 'hidden_activities'>>;

export type Community = {
  id: string;
  name: string;
  invite_code: string;
  created_by: string;
  created_at: string;
};

export type CommunityWithCount = Community & { community_members: { count: number }[] };

export type LeaderboardRow = { user_id: string; display_name: string; avatar_url: string | null; points: number; rank: number };

export type FeedEvent = {
  id: number;
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  /** Empty when the member hides that activity. */
  activity_key: string | null;
  created_at: string;
};

/** What a community mate can see. Null fields are hidden by that person's privacy settings. */
export type MemberProfile = {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  week_points: number;
  season_points: number;
  streak: number | null;
  achievements: { key: string; title: string; icon: string; times: number; last_earned: string }[] | null;
  activities: { activity_key: string; amount: number; points: number }[];
};

export type Achievement = {
  key: string;
  title: string;
  description: string;
  kind: 'once' | 'daily';
  icon: string;
  sort_order: number;
  /** Points added to the day the badge is earned (placeholder values). */
  bonus_points: number;
};

export type UserAchievement = { achievement_key: string; period: string; earned_at: string };

export type NewAchievement = Omit<Achievement, 'sort_order' | 'bonus_points'> & { period: string };

export type MyStats = {
  /** Activity points plus achievement points earned today. */
  today_points: number;
  today_bonus_points: number;
  week_points: number;
  lifetime_points: number;
  streak: number;
  daily_goal: number;
  rest_day_today: boolean;
  rest_days_per_week: number;
};

export type RestDay = { day: string; created_at: string };
