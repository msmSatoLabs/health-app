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

export type DailyPoints = { user_id: string; day: string; points: number };

export type Profile = { id: string; display_name: string; is_premium: boolean; created_at: string };

export type Community = {
  id: string;
  name: string;
  invite_code: string;
  created_by: string;
  created_at: string;
};

export type CommunityWithCount = Community & { community_members: { count: number }[] };

export type LeaderboardRow = { user_id: string; display_name: string; points: number; rank: number };

export type Achievement = {
  key: string;
  title: string;
  description: string;
  kind: 'once' | 'daily';
  icon: string;
  sort_order: number;
};

export type UserAchievement = { achievement_key: string; period: string; earned_at: string };

export type NewAchievement = Omit<Achievement, 'sort_order'> & { period: string };

export type MyStats = {
  today_points: number;
  week_points: number;
  lifetime_points: number;
  streak: number;
  daily_goal: number;
};
