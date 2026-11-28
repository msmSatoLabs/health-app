/** Pure leaderboard helpers for the community screen (no UI, unit tested). */

export type RankedRow = { user_id: string; points: number; rank: number };

/**
 * Splits a leaderboard (already sorted by the database) into the top-3
 * podium and the rest. Small groups (under 3) get no podium.
 */
export function splitPodium<T extends RankedRow>(board: T[]): { podium: T[]; rest: T[] } {
  if (board.length < 3) return { podium: [], rest: board };
  return { podium: board.slice(0, 3), rest: board.slice(3) };
}

/**
 * Points between this user and the closest person with more points, and that
 * person's rank. Null when the user is in first (or not on the board).
 */
export function gapToNext(board: RankedRow[], userId: string): { points: number; rank: number } | null {
  const me = board.find((r) => r.user_id === userId);
  if (!me) return null;
  const ahead = board.filter((r) => r.points > me.points);
  if (ahead.length === 0) return null;
  const next = ahead.reduce((a, b) => (b.points < a.points ? b : a));
  return { points: next.points - me.points, rank: next.rank };
}
