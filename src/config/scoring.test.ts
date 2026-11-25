/// <reference types="node" />
/**
 * Keeps src/config/scoring.ts in step with the SQL migrations, which are
 * the real source of point values. If you tune a number in a new
 * migration, update scoring.ts too (or this test fails).
 */
import { expect, it } from '@jest/globals';
import fs from 'node:fs';
import path from 'node:path';
import { ACHIEVEMENT_POINTS, ACTIVITY_RULES, SCORING_RULES } from './scoring';

const dir = path.join(__dirname, '../../supabase/migrations');
const sql = fs
  .readdirSync(dir)
  .filter((f) => f.endsWith('.sql'))
  .sort()
  .map((f) => fs.readFileSync(path.join(dir, f), 'utf8'))
  .join('\n');

const camel = (s: string) => s.replace(/_(\w)/g, (_, ch: string) => ch.toUpperCase());

it('scoring rules match the scoring_rules table seed', () => {
  const seeded: Record<string, number> = {};
  for (const m of sql.matchAll(/\('(\w+)',\s+(\d+), '[^']*'\)/g)) seeded[camel(m[1])] = Number(m[2]);
  expect(seeded).toEqual(SCORING_RULES);
});

it('achievement points match the SQL', () => {
  const block = sql.slice(sql.indexOf('update public.achievements set bonus_points'));
  const found: Record<string, number> = {};
  for (const m of block.slice(0, block.indexOf('where key')).matchAll(/\('(\w+)', (\d+)\)/g)) found[m[1]] = Number(m[2]);
  expect(found).toEqual(ACHIEVEMENT_POINTS);
});

it('activity rules match the SQL (initial values plus later updates)', () => {
  const found: Record<string, { pointsPerUnit: number; dailyCap: number; maxPerEntry: number; source: string }> = {};
  // Initial rows: ('steps', 'Steps', 'steps', 'health', 0.001, 10, 0.5, 60000, 'walk', 10)
  const row = /\('(\w+)',\s*'[^']*',\s*'[^']*',\s*'(health|manual)',\s*([\d.]+),\s*(\d+),\s*[\d.]+,\s*([\d.]+),/g;
  for (const m of sql.matchAll(row)) {
    found[m[1]] = { source: m[2], pointsPerUnit: Number(m[3]), dailyCap: Number(m[4]), maxPerEntry: Number(m[5]) };
  }
  // Later tuning: update ... set points_per_unit = 1, daily_cap = 9 where key = 'sleep_hours';
  for (const m of sql.matchAll(/set points_per_unit = ([\d.]+), daily_cap = (\d+) where key = '(\w+)'/g)) {
    found[m[3]] = { ...found[m[3]], pointsPerUnit: Number(m[1]), dailyCap: Number(m[2]) };
  }
  expect(found).toEqual(ACTIVITY_RULES);
});

it('manual entries are no longer reduced', () => {
  expect(sql).toMatch(/update public\.activity_types set manual_multiplier = 1/);
});
