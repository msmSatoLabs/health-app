import { describe, expect, it } from '@jest/globals';
import { ACTIVITY_RULES } from '../../config/scoring';
import { activityPoints, dayTotal, previewPoints } from './logic';

const sleep = ACTIVITY_RULES.sleep_hours;
const steps = ACTIVITY_RULES.steps;
const study = ACTIVITY_RULES.study_minutes;

describe('activityPoints', () => {
  it('gives 1 point per hour of sleep', () => {
    expect(activityPoints(1, sleep)).toBe(1);
    expect(activityPoints(7, sleep)).toBe(7);
    expect(activityPoints(9, sleep)).toBe(9);
  });

  it('rounds partial sleep hours down', () => {
    expect(activityPoints(7.5, sleep)).toBe(7);
    expect(activityPoints(0.5, sleep)).toBe(0);
  });

  it('caps sleep at 9 points (no reward for oversleeping)', () => {
    expect(activityPoints(10, sleep)).toBe(9);
    expect(activityPoints(14, sleep)).toBe(9);
  });

  it('applies each daily cap', () => {
    expect(activityPoints(30000, steps)).toBe(10);
    expect(activityPoints(480, study)).toBe(8);
  });

  it('gives nothing for zero or negative amounts', () => {
    expect(activityPoints(0, steps)).toBe(0);
    expect(activityPoints(-5, steps)).toBe(0);
  });

  it("doesn't lose a point to floating-point rounding", () => {
    expect(activityPoints(70, study)).toBe(7); // 0.1 * 70
    expect(activityPoints(35, ACTIVITY_RULES.workout_minutes)).toBe(7); // 0.2 * 35
  });
});

describe('manual entries', () => {
  it('earn the same as synced ones (no manual penalty for now)', () => {
    // There is no source argument at all: the rule is the same for both.
    expect(activityPoints(5000, steps)).toBe(5);
  });
});

describe('previewPoints', () => {
  it('shows what a new entry adds', () => {
    expect(previewPoints(2, ACTIVITY_RULES.water)).toBe(2);
  });

  it('stops at the daily cap', () => {
    expect(previewPoints(3, ACTIVITY_RULES.water, 5)).toBe(1);
    expect(previewPoints(3, ACTIVITY_RULES.water, 6)).toBe(0);
  });

  it('counts partial amounts already logged', () => {
    // 7.5h already logged = 7 pts; another 0.5h makes 8h = 8 pts.
    expect(previewPoints(0.5, sleep, 7.5)).toBe(1);
  });
});

describe('dayTotal', () => {
  it('adds achievement points on top of activity points', () => {
    expect(dayTotal([10, 9, 6], [5, 2])).toBe(32);
  });

  it('works with no achievements', () => {
    expect(dayTotal([4, 4])).toBe(8);
  });
});
