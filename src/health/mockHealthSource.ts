import type { HealthSource, HealthTotals } from './types';

/**
 * Fake Apple Health data so you can try syncing in Expo Go.
 * Only offered in development builds (__DEV__), and only when turned on
 * in the You tab, so real users can never get points from it.
 * Numbers are stable for a given day and grow during the day.
 */
function seeded(day: string) {
  let h = 0;
  for (const ch of day) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return (n: number) => ((h = (h * 1103515245 + 12345) >>> 0) % n);
}

export const mockHealthSource: HealthSource = {
  name: 'Demo health data',
  async isAvailable() {
    return __DEV__;
  },
  async requestPermission() {
    return __DEV__;
  },
  async getDailyTotals(day: string): Promise<HealthTotals> {
    const rnd = seeded(day);
    const hour = new Date().getHours();
    const progress = Math.min(1, Math.max(0.1, hour / 20));
    return {
      steps: Math.round((4000 + rnd(8000)) * progress),
      workout_minutes: Math.round((10 + rnd(50)) * progress),
      sleep_hours: Math.round((60 + rnd(30)) / 10 * 2) / 2,
      active_calories: Math.round((150 + rnd(400)) * progress),
    };
  },
};
