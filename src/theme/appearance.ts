/**
 * The user's light/dark choice: follow the phone ("system"), or always light/dark.
 * Saved on the device (not in Supabase) because it's a display preference, not account data.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';
import { Appearance } from 'react-native';
import { parseThemePreference, type ThemePreference } from './appearanceLogic';

export { resolveIsDark, type ThemePreference } from './appearanceLogic';

const STORAGE_KEY = 'theme-preference';

let current: ThemePreference = 'system';
const listeners = new Set<() => void>();

function apply(preference: ThemePreference) {
  current = preference;
  // Lets native pieces (alerts, keyboard, date pickers) match too. Not available on web.
  try {
    Appearance.setColorScheme?.(preference === 'system' ? 'auto' : preference);
  } catch {
    // The app's own colors still follow the choice through useThemePreference().
  }
  listeners.forEach((l) => l());
}

/** Reads the saved choice. Called once at startup, before the splash screen hides. */
export async function loadThemePreference(): Promise<void> {
  try {
    apply(parseThemePreference(await AsyncStorage.getItem(STORAGE_KEY)));
  } catch {
    apply('system');
  }
}

export async function setThemePreference(preference: ThemePreference): Promise<void> {
  apply(preference);
  try {
    await AsyncStorage.setItem(STORAGE_KEY, preference);
  } catch {
    // Still applied for this session; it just won't be remembered.
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useThemePreference(): ThemePreference {
  return useSyncExternalStore(subscribe, () => current, () => current);
}
