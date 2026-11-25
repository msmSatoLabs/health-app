/** The phone's local calendar day as YYYY-MM-DD (what the database calls "day"). */
export function localDay(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function addDays(day: string, n: number): string {
  const [y, m, d] = day.split('-').map(Number);
  return localDay(new Date(y, m - 1, d + n));
}

export function prettyDay(day: string, today = localDay()): string {
  if (day === today) return 'Today';
  if (day === addDays(today, -1)) return 'Yesterday';
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

export function shortWeekday(day: string): string {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: 'narrow' });
}

/**
 * Seasons are calendar months, written 'YYYY-MM'. Everyone's season
 * starts on the 1st, so community standings reset each month.
 */
export type Season = `${number}-${number}`;

export function seasonOf(day: string): Season {
  return day.slice(0, 7) as Season;
}

/** First and last day of a season (the last day is capped at today). */
export function seasonRange(season: string, today = localDay()): [string, string] {
  const [y, m] = season.split('-').map(Number);
  const last = localDay(new Date(y, m, 0));
  return [`${season}-01`, last < today ? last : today];
}

export function seasonLabel(season: string, style: 'long' | 'short' = 'long'): string {
  const [y, m] = season.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: style, year: 'numeric' });
}

/** Seasons from the one containing firstDay up to the current one, newest first. */
export function seasonsSince(firstDay: string, today = localDay()): Season[] {
  const out: Season[] = [];
  let [y, m] = seasonOf(today).split('-').map(Number);
  const stop = seasonOf(firstDay < today ? firstDay : today);
  for (;;) {
    const s = `${y}-${String(m).padStart(2, '0')}` as Season;
    out.push(s);
    if (s <= stop) break;
    m -= 1;
    if (m === 0) {
      m = 12;
      y -= 1;
    }
  }
  return out;
}

export function monthLetter(monthIndex: number): string {
  return new Date(2000, monthIndex, 1).toLocaleDateString(undefined, { month: 'narrow' });
}

/** "5m ago", "3h ago", "2d ago". */
export function timeAgo(iso: string, now = Date.now()): string {
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

/** "Nov 25" (adds the year if it isn't this year). */
export function shortDate(iso: string): string {
  const d = new Date(iso);
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', ...(sameYear ? {} : { year: 'numeric' }) });
}
