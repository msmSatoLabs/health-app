/**
 * Points math, as pure functions. The database does the real scoring
 * (`daily_activity_points` and `daily_points` views); these mirror it so the
 * app can preview points and so the rules are covered by unit tests.
 */
import type { ActivityRule } from '../../config/scoring';

/**
 * Points one activity earns in a day from its total amount.
 * Manual and synced entries score the same. The daily cap always applies.
 */
export function activityPoints(totalAmount: number, rule: Pick<ActivityRule, 'pointsPerUnit' | 'dailyCap'>): number {
  if (!(totalAmount > 0)) return 0;
  // The tiny nudge stops floating-point results like 6.9999999 rounding down to 6
  // (the database uses exact decimals, so 0.1 * 70 is exactly 7 there).
  const raw = Math.floor(totalAmount * rule.pointsPerUnit + 1e-9);
  return Math.min(rule.dailyCap, raw);
}

/**
 * How many more points a new entry would add today, given the amount of
 * this activity already logged today. Used for the "+N pts" preview.
 */
export function previewPoints(
  amount: number,
  rule: Pick<ActivityRule, 'pointsPerUnit' | 'dailyCap'>,
  amountAlreadyToday = 0,
): number {
  return Math.max(0, activityPoints(amountAlreadyToday + amount, rule) - activityPoints(amountAlreadyToday, rule));
}

/** A day's total: capped activity points plus bonus points from achievements earned that day. */
export function dayTotal(activityPointsList: number[], achievementBonuses: number[] = []): number {
  const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
  return sum(activityPointsList) + sum(achievementBonuses);
}
