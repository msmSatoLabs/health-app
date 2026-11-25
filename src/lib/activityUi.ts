import { previewPoints } from '../features/points/logic';
import type { ActivityType } from './types';

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

/**
 * Points preview for a new entry, given the amount already logged today.
 * The database does the real math (and caps).
 */
export function estimatePoints(t: ActivityType, amount: number, amountAlreadyToday: number) {
  return previewPoints(amount, { pointsPerUnit: t.points_per_unit, dailyCap: t.daily_cap }, amountAlreadyToday);
}

export function formatAmount(amount: number, unit: string) {
  const n = Number.isInteger(amount) ? amount.toLocaleString() : amount.toFixed(1);
  const u = amount === 1 ? singular(unit) : unit;
  return `${n} ${u}`;
}

/** "glasses" -> "glass", "minutes" -> "minute", "kcal" -> "kcal". */
export function singular(unit: string) {
  if (unit.endsWith('sses')) return unit.slice(0, -2);
  if (unit.endsWith('s')) return unit.slice(0, -1);
  return unit;
}
