/**
 * Rest day rules, as pure functions (mirrors plan_rest_day() in the database).
 *
 * - Weeks run Monday to Sunday.
 * - A rest day has to be planned before its week starts, so the deadline
 *   is the end of the Sunday before.
 * - Each person gets SCORING_RULES.restDaysPerWeek per week (more can be
 *   bought later). A planned rest day keeps a streak alive without adding to it.
 * - A planned rest day can be cancelled until the same deadline.
 */
import { SCORING_RULES } from '../../config/scoring';
import { addDays } from '../../lib/dates';

/** Monday of the week that contains `day` (YYYY-MM-DD). */
export function weekStart(day: string): string {
  const [y, m, d] = day.split('-').map(Number);
  const weekday = new Date(y, m - 1, d).getDay(); // 0 = Sunday
  return addDays(day, -((weekday + 6) % 7));
}

/** The seven days (Monday first) of the week that contains `day`. */
export function weekDays(day: string): string[] {
  const start = weekStart(day);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

/** The first week a rest day can still be planned for (next Monday to Sunday). */
export function nextPlannableWeek(today: string): string[] {
  return weekDays(addDays(weekStart(today), 7));
}

/** True while a rest day on `day` can still be planned or cancelled. */
export function isBeforeDeadline(day: string, today: string): boolean {
  return weekStart(day) > today;
}

export type PlanCheck =
  | { ok: true }
  | { ok: false; reason: 'too_late' | 'too_far' | 'week_full' | 'already_planned' };

/** Whether `day` can be planned as a rest day, given the days already planned. */
export function canPlanRestDay(
  day: string,
  today: string,
  planned: string[],
  perWeek: number = SCORING_RULES.restDaysPerWeek,
): PlanCheck {
  if (planned.includes(day)) return { ok: false, reason: 'already_planned' };
  if (!isBeforeDeadline(day, today)) return { ok: false, reason: 'too_late' };
  if (day > addDays(today, SCORING_RULES.restDayMaxDaysAhead)) return { ok: false, reason: 'too_far' };
  const week = weekStart(day);
  const inWeek = planned.filter((p) => weekStart(p) === week).length;
  if (inWeek >= perWeek) return { ok: false, reason: 'week_full' };
  return { ok: true };
}

/**
 * With one rest day per week, tapping a different day in a week that
 * already has its rest day moves it there. Returns the day to move from,
 * or null when it isn't a move (nothing planned that week, more than one
 * rest day allowed, or the new day can't be planned anyway).
 */
export function restDayToMove(
  day: string,
  today: string,
  planned: string[],
  perWeek: number = SCORING_RULES.restDaysPerWeek,
): string | null {
  if (perWeek !== 1 || planned.includes(day)) return null;
  const week = weekStart(day);
  const sameWeek = planned.filter((p) => weekStart(p) === week);
  if (sameWeek.length !== 1) return null;
  const from = sameWeek[0];
  if (!isBeforeDeadline(from, today)) return null;
  const rest = planned.filter((p) => p !== from);
  return canPlanRestDay(day, today, rest, perWeek).ok ? from : null;
}

export function restDayReasonText(reason: Exclude<PlanCheck, { ok: true }>['reason']): string {
  switch (reason) {
    case 'too_late':
      return 'Rest days have to be planned before their week starts (by Sunday night).';
    case 'too_far':
      return `You can plan up to ${SCORING_RULES.restDayMaxDaysAhead} days ahead.`;
    case 'week_full':
      return "You've already planned your rest day for that week.";
    case 'already_planned':
      return "That's already a rest day.";
  }
}
