import { describe, expect, it } from '@jest/globals';
import { canPlanRestDay, isBeforeDeadline, nextPlannableWeek, weekDays, weekStart } from './logic';

// 2026-11-25 is a Wednesday. Its week runs Mon 23 to Sun 29.
const WED = '2026-11-25';
const SUN = '2026-11-29';
const NEXT_MON = '2026-11-30';

describe('weeks', () => {
  it('start on Monday', () => {
    expect(weekStart(WED)).toBe('2026-11-23');
    expect(weekStart('2026-11-23')).toBe('2026-11-23');
    expect(weekStart(SUN)).toBe('2026-11-23');
    expect(weekStart(NEXT_MON)).toBe(NEXT_MON);
  });

  it('cross month and year boundaries', () => {
    expect(weekStart('2027-01-01')).toBe('2026-12-28');
    expect(weekDays('2027-01-01')).toEqual([
      '2026-12-28', '2026-12-29', '2026-12-30', '2026-12-31', '2027-01-01', '2027-01-02', '2027-01-03',
    ]);
  });

  it('the next plannable week is the coming Monday to Sunday', () => {
    expect(nextPlannableWeek(WED)[0]).toBe(NEXT_MON);
    expect(nextPlannableWeek(SUN)[0]).toBe(NEXT_MON);
    expect(nextPlannableWeek(NEXT_MON)[0]).toBe('2026-12-07');
  });
});

describe('deadline', () => {
  it('is open for next week until the end of Sunday', () => {
    expect(isBeforeDeadline('2026-12-03', WED)).toBe(true);
    expect(isBeforeDeadline('2026-12-03', SUN)).toBe(true);
    expect(isBeforeDeadline('2026-12-03', NEXT_MON)).toBe(false);
  });

  it('is closed for the current week', () => {
    expect(isBeforeDeadline(SUN, WED)).toBe(false);
    expect(isBeforeDeadline(WED, WED)).toBe(false);
  });
});

describe('canPlanRestDay', () => {
  it('allows one day next week', () => {
    expect(canPlanRestDay('2026-12-02', WED, [])).toEqual({ ok: true });
  });

  it('allows it right up to Sunday night', () => {
    expect(canPlanRestDay('2026-12-06', SUN, [])).toEqual({ ok: true });
  });

  it('refuses days in the current week', () => {
    expect(canPlanRestDay('2026-11-28', WED, [])).toEqual({ ok: false, reason: 'too_late' });
  });

  it('refuses a second day in the same week', () => {
    expect(canPlanRestDay('2026-12-04', WED, ['2026-12-02'])).toEqual({ ok: false, reason: 'week_full' });
  });

  it('allows one in each week', () => {
    expect(canPlanRestDay('2026-12-09', WED, ['2026-12-02'])).toEqual({ ok: true });
  });

  it('allows more with extra rest days (future paid plan)', () => {
    expect(canPlanRestDay('2026-12-04', WED, ['2026-12-02'], 2)).toEqual({ ok: true });
  });

  it('refuses days too far ahead', () => {
    expect(canPlanRestDay('2027-02-01', WED, [])).toEqual({ ok: false, reason: 'too_far' });
  });

  it('notices an already planned day', () => {
    expect(canPlanRestDay('2026-12-02', WED, ['2026-12-02'])).toEqual({ ok: false, reason: 'already_planned' });
  });
});
