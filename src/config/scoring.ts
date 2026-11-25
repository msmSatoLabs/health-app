/**
 * Point values and limits (PLACEHOLDERS, tuned after launch).
 *
 * The database is the real source: the `activity_types` and `scoring_rules`
 * tables and the `achievements.bonus_points` column. This file mirrors them
 * so the app can preview points and so the rules can be unit tested.
 * `scoring.test.ts` fails if this file and the SQL drift apart.
 */
import type { ActivitySource } from '../lib/types';

export type ActivityRule = {
  /** Points for one unit (0.001 per step = 1 point per 1,000 steps). */
  pointsPerUnit: number;
  /** Most points this activity can earn in one day. */
  dailyCap: number;
  /** Biggest single entry allowed (blocks typos and extremes). */
  maxPerEntry: number;
  /** Where it normally comes from. Manual entries currently earn full points too. */
  source: ActivitySource;
};

export const ACTIVITY_RULES: Record<string, ActivityRule> = {
  steps: { pointsPerUnit: 0.001, dailyCap: 10, maxPerEntry: 60000, source: 'health' },
  workout_minutes: { pointsPerUnit: 0.2, dailyCap: 12, maxPerEntry: 240, source: 'health' },
  /** 1 point per hour of sleep, topping out at 9. */
  sleep_hours: { pointsPerUnit: 1, dailyCap: 9, maxPerEntry: 14, source: 'health' },
  active_calories: { pointsPerUnit: 0.02, dailyCap: 10, maxPerEntry: 3000, source: 'health' },
  water: { pointsPerUnit: 1, dailyCap: 6, maxPerEntry: 12, source: 'manual' },
  meals: { pointsPerUnit: 2, dailyCap: 6, maxPerEntry: 3, source: 'manual' },
  study_minutes: { pointsPerUnit: 0.1, dailyCap: 8, maxPerEntry: 480, source: 'manual' },
  social: { pointsPerUnit: 4, dailyCap: 8, maxPerEntry: 3, source: 'manual' },
};

/** Mirrors the `scoring_rules` table. */
export const SCORING_RULES = {
  /** Points for a "complete" day (fills the ring, earns "Goal crushed"). */
  dailyGoal: 40,
  /** Points a day needs to count toward a streak. */
  streakMinPoints: 10,
  /** Communities a free user can be in. */
  freeCommunityLimit: 1,
  /** Planned rest days per week (Monday to Sunday) before a missed day breaks a streak. */
  restDaysPerWeek: 1,
  /** How far ahead a rest day can be planned. */
  restDayMaxDaysAhead: 35,
} as const;

/** Mirrors `achievements.bonus_points`. Added to the day the badge was earned. */
export const ACHIEVEMENT_POINTS: Record<string, number> = {
  first_log: 5,
  team_player: 10,
  streak_3: 15,
  streak_7: 30,
  points_500: 25,
  daily_goal: 5,
  hydrated: 2,
  well_rested: 2,
  all_rounder: 3,
};
