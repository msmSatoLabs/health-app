/**
 * A HealthSource reads daily totals from the phone's health data.
 * The app only talks to this interface, so we can swap the real Apple Health
 * reader in later without touching any screens.
 */
export type HealthTotals = {
  steps?: number;
  workout_minutes?: number;
  sleep_hours?: number;
  active_calories?: number;
};

export interface HealthSource {
  /** Short name shown in the app, e.g. "Apple Health" or "Demo data". */
  readonly name: string;
  /** True when this source can run on the current device/build. */
  isAvailable(): Promise<boolean>;
  /** Asks the user for permission. Returns true if granted. */
  requestPermission(): Promise<boolean>;
  /** Totals for one local day (YYYY-MM-DD). */
  getDailyTotals(day: string): Promise<HealthTotals>;
}
