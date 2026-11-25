/**
 * Pure helpers that turn daily point rows into chart bars, season
 * summaries and trends. No React or Supabase here, so they're easy to test.
 */
import type { Bar } from '../components/BarChart';
import { addDays, monthLetter, seasonOf, seasonsSince, shortWeekday, type Season } from './dates';
import type { DailyActivityPoints, DailyPoints } from './types';

export type HistoryRange = 'week' | 'month' | 'year';

export type RangeSummary = { bars: Bar[]; total: number; perDay: number; goalDays: number; labelEvery: number };

function pointsByDay(rows: DailyPoints[]): Map<string, number> {
  return new Map(rows.map((r) => [r.day, r.points]));
}

/** Bars for the last 7 days, last 30 days, or last 12 months (one bar per month). */
export function rangeSummary(range: HistoryRange, rows: DailyPoints[], today: string, goal: number): RangeSummary {
  const byDay = pointsByDay(rows);
  if (range === 'year') {
    const [ty, tm] = today.split('-').map(Number);
    const bars: Bar[] = [];
    let total = 0;
    let goalDays = 0;
    for (let i = 11; i >= 0; i--) {
      const d = new Date(ty, tm - 1 - i, 1);
      const season = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const inMonth = rows.filter((r) => seasonOf(r.day) === season);
      const value = inMonth.reduce((a, r) => a + r.points, 0);
      total += value;
      goalDays += inMonth.filter((r) => r.points >= goal).length;
      bars.push({ key: season, label: monthLetter(d.getMonth()), value });
    }
    return { bars, total, perDay: Math.round(total / 365), goalDays, labelEvery: 1 };
  }
  const days = range === 'week' ? 7 : 30;
  const bars: Bar[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const day = addDays(today, -i);
    const label = range === 'week' ? shortWeekday(day) : String(Number(day.slice(8)));
    bars.push({ key: day, label, value: byDay.get(day) ?? 0 });
  }
  const total = bars.reduce((a, b) => a + b.value, 0);
  return {
    bars,
    total,
    perDay: Math.round(total / days),
    goalDays: bars.filter((b) => b.value >= goal).length,
    labelEvery: range === 'week' ? 1 : 7,
  };
}

export type SeasonSummary = { season: Season; points: number; activeDays: number; goalDays: number; current: boolean };

/** One summary per season (calendar month), newest first, from the first day with points. */
export function seasonSummaries(rows: DailyPoints[], today: string, goal: number): SeasonSummary[] {
  const first = rows[0]?.day ?? today;
  const current = seasonOf(today);
  return seasonsSince(first, today).map((season) => {
    const inSeason = rows.filter((r) => seasonOf(r.day) === season);
    return {
      season,
      points: inSeason.reduce((a, r) => a + r.points, 0),
      activeDays: inSeason.filter((r) => r.points > 0).length,
      goalDays: inSeason.filter((r) => r.points >= goal).length,
      current: season === current,
    };
  });
}

export type Trend = {
  activityKey: string;
  /** Average amount per day over the last 7 days. */
  recent: number;
  /** Average amount per day over the 28 days before that. */
  baseline: number;
  direction: 'up' | 'down' | 'steady' | 'new';
};

/**
 * Apple Health-style trends: is each activity going up or down?
 * Compares the last 7 days with the 28 days before them (daily averages).
 * A change of less than 10% counts as steady.
 */
export function activityTrends(rows: DailyActivityPoints[], today: string): Trend[] {
  const recentStart = addDays(today, -6);
  const baseStart = addDays(today, -34);
  const sums = new Map<string, { recent: number; base: number }>();
  for (const r of rows) {
    if (r.day > today || r.day < baseStart) continue;
    const s = sums.get(r.activity_key) ?? { recent: 0, base: 0 };
    if (r.day >= recentStart) s.recent += Number(r.amount);
    else s.base += Number(r.amount);
    sums.set(r.activity_key, s);
  }
  return [...sums.entries()].map(([activityKey, s]) => {
    const recent = s.recent / 7;
    const baseline = s.base / 28;
    let direction: Trend['direction'] = 'steady';
    if (baseline === 0) direction = recent > 0 ? 'new' : 'steady';
    else if (recent > baseline * 1.1) direction = 'up';
    else if (recent < baseline * 0.9) direction = 'down';
    return { activityKey, recent, baseline, direction };
  });
}
