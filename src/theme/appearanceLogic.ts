/** Pure rules for the light/dark choice (kept apart from storage so they can be unit tested). */

export type ThemePreference = 'system' | 'light' | 'dark';

const PREFERENCES: ThemePreference[] = ['system', 'light', 'dark'];

/** Whether the app should draw dark, given the user's choice and the phone's setting. */
export function resolveIsDark(preference: ThemePreference, systemScheme: string | null | undefined): boolean {
  if (preference === 'system') return systemScheme === 'dark';
  return preference === 'dark';
}

/** Turns what was saved on the device back into a choice; anything unknown means "system". */
export function parseThemePreference(raw: string | null): ThemePreference {
  return PREFERENCES.includes(raw as ThemePreference) ? (raw as ThemePreference) : 'system';
}
