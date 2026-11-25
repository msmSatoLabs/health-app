import AsyncStorage from '@react-native-async-storage/async-storage';
import { syncHealthDay } from '../lib/api';
import { localDay } from '../lib/dates';
import { healthKitSource } from './healthKitSource';
import { mockHealthSource } from './mockHealthSource';
import type { HealthSource } from './types';

export type { HealthSource, HealthTotals } from './types';

const DEMO_KEY = 'health.demoEnabled';

export async function isDemoHealthEnabled() {
  return __DEV__ && (await AsyncStorage.getItem(DEMO_KEY)) === '1';
}

export async function setDemoHealthEnabled(on: boolean) {
  await AsyncStorage.setItem(DEMO_KEY, on ? '1' : '0');
}

/** Picks the best source: real Apple Health if available, else demo data if turned on, else none. */
export async function getHealthSource(): Promise<HealthSource | null> {
  if (await healthKitSource.isAvailable()) return healthKitSource;
  if (await isDemoHealthEnabled()) return mockHealthSource;
  return null;
}

/** Reads today's totals and saves them. Returns the source name, or null if nothing to sync from. */
export async function syncToday(): Promise<string | null> {
  const source = await getHealthSource();
  if (!source) return null;
  if (!(await source.requestPermission())) return null;
  const day = localDay();
  const totals = await source.getDailyTotals(day);
  const clean: Record<string, number> = {};
  for (const [k, v] of Object.entries(totals)) if (typeof v === 'number' && v > 0) clean[k] = v;
  await syncHealthDay(day, clean);
  return source.name;
}
