/**
 * Streak rules, as pure functions (mirrors streak_for() in the database).
 *
 * A streak is the run of days, ending today or yesterday, where you earned
 * at least SCORING_RULES.streakMinPoints. A planned rest day doesn't break
 * the run and doesn't add to it, unless you earned enough points that day
 * anyway, in which case it counts like any other day.
 * Today never breaks a streak: there is still time to log something.
 */
import { SCORING_RULES } from '../../config/scoring';
import { addDays } from '../../lib/dates';

export function computeStreak(
  /** Total points per day (activity + achievement points), keyed by YYYY-MM-DD. */
  pointsByDay: Record<string, number>,
  /** Planned rest days (YYYY-MM-DD). */
  restDays: string[],
  today: string,
  minPoints: number = SCORING_RULES.streakMinPoints,
): number {
  const rest = new Set(restDays);
  const counts = (day: string) => (pointsByDay[day] ?? 0) >= minPoints;

  let day = today;
  if (!counts(day) && !rest.has(day)) day = addDays(day, -1);

  let streak = 0;
  // The run can't go back further than the earliest day with any data.
  const earliest = [...Object.keys(pointsByDay), ...restDays].sort()[0] ?? today;
  while (day >= earliest) {
    if (counts(day)) streak += 1;
    else if (!rest.has(day)) break;
    day = addDays(day, -1);
  }
  return streak;
}

export type StreakHint =
  | { kind: 'counted' } // today already has enough points for the streak
  | { kind: 'keeps' } // this entry is what makes today count
  | { kind: 'short'; pointsNeeded: number }; // still not enough after this entry

/**
 * What logging `addPoints` more would mean for today's streak, given the
 * points already earned today and the streak minimum. Preview only: the
 * database decides the real streak.
 */
export function streakHint(todayPoints: number, addPoints: number, minPoints: number): StreakHint {
  if (todayPoints >= minPoints) return { kind: 'counted' };
  if (todayPoints + addPoints >= minPoints) return { kind: 'keeps' };
  return { kind: 'short', pointsNeeded: minPoints - todayPoints - addPoints };
}
