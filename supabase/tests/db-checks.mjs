/**
 * Database checks for the scoring, achievement-points and rest-day rules.
 *
 * Runs every file in supabase/migrations against an in-memory Postgres
 * (PGlite, no Docker or Supabase account needed), with a tiny stand-in
 * for Supabase's auth and storage, then checks the rules as real users.
 *
 *   npm run test:db
 */
import { PGlite } from '@electric-sql/pglite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = process.argv[2] ?? fileURLToPath(new URL('../migrations', import.meta.url));
const db = new PGlite();
const q = async (sql, params) => (await db.query(sql, params)).rows;
let fails = 0;
const expect = (label, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) fails++;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${label}${ok ? '' : `: got ${JSON.stringify(got)} want ${JSON.stringify(want)}`}`);
};
const expectError = async (label, fn, match) => {
  try { await fn(); fails++; console.log(`FAIL ${label}: no error`); }
  catch (e) { const ok = e.message.includes(match); if (!ok) fails++; console.log(`${ok ? 'PASS' : 'FAIL'} ${label}${ok ? '' : `: ${e.message}`}`); }
};

await db.exec(`
  create role anon; create role authenticated;
  create schema auth;
  create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb default '{}');
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  create schema storage;
  create table storage.buckets (id text primary key, name text, public bool, file_size_limit int, allowed_mime_types text[]);
  create table storage.objects (bucket_id text, name text);
  alter table storage.objects enable row level security;
  create function storage.foldername(name text) returns text[] language sql as $$ select string_to_array(name, '/') $$;
  grant usage on schema auth, storage to anon, authenticated;
`);

const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
for (const f of files) await db.exec(fs.readFileSync(path.join(dir, f), 'utf8'));
// The newest file must be safe to run twice.
await db.exec(fs.readFileSync(path.join(dir, files.at(-1)), 'utf8'));
console.log('migrations ran:', files.join(', '));

const A = '00000000-0000-0000-0000-00000000000a';
const B = '00000000-0000-0000-0000-00000000000b';
await db.exec(`insert into auth.users (id, email) values ('${A}', 'a@x.test'), ('${B}', 'b@x.test')`);

const [{ today }] = await q(`select current_date::text as today`);
const day = async (n) => (await q(`select (current_date + $1::int)::text as d`, [n]))[0].d;

// Seed past days directly (the app can only log today/yesterday).
await db.exec(`alter table activity_logs disable trigger activity_logs_check`);
for (const n of [-1, -2, -4, -5]) {
  await q(`insert into activity_logs (user_id, activity_key, source, amount, day) values ($1, 'steps', 'health', 12000, $2)`, [A, await day(n)]);
}
await q(`insert into rest_days (user_id, day) values ($1, $2)`, [A, await day(-3)]);
await db.exec(`alter table activity_logs enable trigger activity_logs_check`);

const as = async (uid, fn) => {
  await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub', '${uid}', false);`);
  try { return await fn(); } finally { await db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false);`); }
};

await as(A, async () => {
  // Manual entries earn full points; sleep 1/hr capped at 9.
  await q(`insert into activity_logs (activity_key, source, amount, day) values ('steps', 'manual', 5000, $1)`, [today]);
  await q(`insert into activity_logs (activity_key, source, amount, day) values ('sleep_hours', 'manual', 7.5, $1)`, [today]);
  let pts = await q(`select activity_key, points from daily_activity_points where day = $1 order by 1`, [today]);
  expect('manual steps full points, sleep 7.5h = 7', pts, [{ activity_key: 'sleep_hours', points: 7 }, { activity_key: 'steps', points: 5 }]);
  await q(`insert into activity_logs (activity_key, source, amount, day) values ('sleep_hours', 'manual', 5, $1)`, [today]);
  pts = await q(`select points from daily_activity_points where day = $1 and activity_key = 'sleep_hours'`, [today]);
  expect('sleep caps at 9', pts, [{ points: 9 }]);

  // Streak: 4 good days, rest day at -3 skipped; today has 14 points so counts.
  let stats = (await q(`select my_stats($1) as s`, [today]))[0].s;
  expect('streak with rest day (today counts)', stats.streak, 5);
  expect('rest_days_per_week', stats.rest_days_per_week, 1);
  expect('rest_day_today false', stats.rest_day_today, false);

  // Achievements add to the day's total.
  const earned = (await q(`select key from evaluate_achievements($1) order by key`, [today])).map((r) => r.key);
  expect('achievements earned', earned, ['first_log', 'streak_3', 'well_rested']);
  stats = (await q(`select my_stats($1) as s`, [today]))[0].s;
  expect('today points include bonus (14 + 5 + 15 + 2)', [stats.today_points, stats.today_bonus_points], [36, 22]);
  const dp = await q(`select points, activity_points, bonus_points from daily_points where day = $1`, [today]);
  expect('daily_points split', dp, [{ points: 36, activity_points: 14, bonus_points: 22 }]);

  // Leaderboard includes achievement points.
  const c = (await q(`select * from create_community('Test crew')`))[0];
  await q(`select * from evaluate_achievements($1)`, [today]); // team_player +10
  const lb = await q(`select points from community_leaderboard($1, $2, $2)`, [c.id, today]);
  expect('leaderboard today includes bonuses', lb, [{ points: 46 }]);

  // Rest day planning.
  await q(`select set_my_time_zone('America/Los_Angeles')`);
  await expectError('bad time zone rejected', () => q(`select set_my_time_zone('Mars/Base')`), 'unknown time zone');
  await q(`select set_my_time_zone('UTC')`);
  const [{ nextMon }] = await q(`select (date_trunc('week', current_date)::date + 7)::text as "nextMon"`);
  const plus = async (d, n) => (await q(`select ($1::date + $2::int)::text as d`, [d, n]))[0].d;
  await q(`select plan_rest_day($1)`, [await plus(nextMon, 2)]);
  await q(`select plan_rest_day($1)`, [await plus(nextMon, 2)]); // repeat is harmless
  await expectError('second rest day same week', () => q(`select plan_rest_day($1)`, [nextMon]), 'rest_day_week_full');
  await expectError('this week is too late', () => q(`select plan_rest_day($1)`, [today]), 'rest_day_too_late');
  await expectError('too far ahead (60 days)', () => q(`select plan_rest_day((current_date + 60))`), 'rest_day_too_far');
  await q(`select plan_rest_day($1)`, [await plus(nextMon, 7)]); // following week is fine
  await q(`select cancel_rest_day($1)`, [await plus(nextMon, 2)]);
  await q(`select plan_rest_day($1)`, [nextMon]); // freed up after cancel
  const mine = (await q(`select day::text from rest_days order by day`)).map((r) => r.day);
  expect('my rest days', mine, [await day(-3), nextMon, await plus(nextMon, 7)]);
  await expectError('cancel past rest day', async () => q(`select cancel_rest_day($1)`, [await day(-3)]), 'rest_day_too_late');

  // Things the app must not be able to do directly.
  await expectError('no direct rest_days insert', () => q(`insert into rest_days (day) values (current_date + 20)`), 'permission denied');
  await expectError('cannot give yourself rest days', () => q(`update profiles set extra_rest_days = 5`), 'permission denied');
  await expectError('cannot change rules', () => q(`update scoring_rules set value = 0`), 'permission denied');
  await expectError('streak_for is internal', () => q(`select streak_for($1, current_date)`, [B]), 'permission denied');
});

await as(B, async () => {
  const rd = await q(`select * from rest_days`);
  expect("B can't see A's rest days", rd.length, 0);
  const dp = await q(`select * from daily_points`);
  expect("B can't read A's daily points", dp.length, 0);
});

// Extra rest days (future paid plan) raise the weekly allowance.
await q(`update profiles set extra_rest_days = 1 where id = $1`, [A]);
await as(A, async () => {
  const [{ nextMon }] = await q(`select (date_trunc('week', current_date)::date + 7)::text as "nextMon"`);
  await q(`select plan_rest_day(($1::date + 3))`, [nextMon]);
  expect('second rest day allowed with extra', (await q(`select count(*)::int as n from rest_days where day >= $1::date and day < $1::date + 7`, [nextMon]))[0].n, 2);
});

// Streak breaks on a missed non-rest day; today unfinished doesn't break it.
await q(`delete from activity_logs where user_id = $1 and day = current_date`, [A]);
await q(`delete from user_achievements where user_id = $1`, [A]);
await as(A, async () => {
  const s = (await q(`select my_stats($1) as s`, [today]))[0].s;
  expect('streak while today is still empty', s.streak, 4);
});
await q(`delete from rest_days where user_id = $1 and day = current_date - 3`, [A]);
await as(A, async () => {
  const s = (await q(`select my_stats($1) as s`, [today]))[0].s;
  expect('streak breaks without the rest day', s.streak, 2);
});

console.log(fails ? `\n${fails} FAILED` : '\nall SQL checks passed');
process.exit(fails ? 1 : 0);
