import type { ActivitySource, ActivityType } from './types';

/** How the amount stepper behaves for each activity on the Log screen. */
export const stepper: Record<string, { step: number; start: number }> = {
  steps: { step: 500, start: 2000 },
  workout_minutes: { step: 5, start: 30 },
  sleep_hours: { step: 0.5, start: 7 },
  active_calories: { step: 50, start: 200 },
  water: { step: 1, start: 1 },
  meals: { step: 1, start: 1 },
  study_minutes: { step: 15, start: 30 },
  social: { step: 1, start: 1 },
};

/** Rough points preview. The database does the real math (and caps). */
export function estimatePoints(t: ActivityType, amount: number, source: ActivitySource, alreadyToday: number) {
  const mult = source === 'manual' ? t.manual_multiplier : 1;
  const raw = Math.floor(amount * t.points_per_unit * mult);
  return Math.max(0, Math.min(raw, t.daily_cap - alreadyToday));
}

export function formatAmount(amount: number, unit: string) {
  const n = Number.isInteger(amount) ? amount.toLocaleString() : amount.toFixed(1);
  const u = amount === 1 && unit.endsWith('s') ? unit.slice(0, -1) : unit;
  return `${n} ${u}`;
}
