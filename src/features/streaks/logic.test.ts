import { describe, expect, it } from '@jest/globals';
import { computeStreak } from './logic';

const TODAY = '2026-11-25'; // a Wednesday

/** Builds a points map from [day, points] pairs. */
const pts = (...days: [string, number][]) => Object.fromEntries(days);

describe('computeStreak', () => {
  it('is 0 with no activity', () => {
    expect(computeStreak({}, [], TODAY)).toBe(0);
  });

  it('counts consecutive days with enough points', () => {
    expect(computeStreak(pts(['2026-11-23', 12], ['2026-11-24', 15], ['2026-11-25', 10]), [], TODAY)).toBe(3);
  });

  it("doesn't break just because today isn't done yet", () => {
    expect(computeStreak(pts(['2026-11-23', 12], ['2026-11-24', 15]), [], TODAY)).toBe(2);
    expect(computeStreak(pts(['2026-11-23', 12], ['2026-11-24', 15], ['2026-11-25', 3]), [], TODAY)).toBe(2);
  });

  it('breaks on a missed day', () => {
    expect(computeStreak(pts(['2026-11-22', 12], ['2026-11-24', 15]), [], TODAY)).toBe(1);
  });

  it('is 0 when the last good day was before yesterday', () => {
    expect(computeStreak(pts(['2026-11-22', 12], ['2026-11-23', 12]), [], TODAY)).toBe(0);
  });

  it('needs at least the minimum points', () => {
    expect(computeStreak(pts(['2026-11-24', 9]), [], TODAY)).toBe(0);
    expect(computeStreak(pts(['2026-11-24', 10]), [], TODAY)).toBe(1);
  });

  it('keeps the streak alive over a planned rest day without adding to it', () => {
    const days = pts(['2026-11-21', 12], ['2026-11-22', 12], ['2026-11-24', 12]);
    expect(computeStreak(days, ['2026-11-23'], TODAY)).toBe(3);
  });

  it('counts a rest day normally if you earned enough points anyway', () => {
    const days = pts(['2026-11-23', 12], ['2026-11-24', 12]);
    expect(computeStreak(days, ['2026-11-24'], TODAY)).toBe(2);
  });

  it('is safe when today itself is the rest day', () => {
    expect(computeStreak(pts(['2026-11-23', 12], ['2026-11-24', 12]), ['2026-11-25'], TODAY)).toBe(2);
  });

  it('keeps it alive when yesterday was the rest day and today is not done yet', () => {
    expect(computeStreak(pts(['2026-11-22', 12], ['2026-11-23', 12]), ['2026-11-24'], TODAY)).toBe(2);
  });

  it('still breaks on a missed day that was not planned', () => {
    const days = pts(['2026-11-20', 12], ['2026-11-22', 12], ['2026-11-24', 12]);
    // 23rd is a rest day, 21st was simply missed.
    expect(computeStreak(days, ['2026-11-23'], TODAY)).toBe(2);
  });

  it('counts achievement points toward the minimum (totals are passed in)', () => {
    // 6 activity points + 5 for "First step" = 11 that day.
    expect(computeStreak(pts(['2026-11-24', 6 + 5]), [], TODAY)).toBe(1);
  });
});
