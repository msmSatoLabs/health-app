# PLAN.md

Product plan and MVP build order. Working conventions are in [CLAUDE.md](CLAUDE.md). The longer-form plan lives in Notion (Projects / Health app / Plan); this file is the version to build from.

## Where things stand (Nov 27, 2026)

The first version (PR #2) covers most of Phases 0 to 6 in one pass. It runs in Expo Go against a hosted Supabase project; setup steps are in [SETUP.md](SETUP.md).

**Built:** email sign-up/sign-in, profiles (created on sign-up, editable name), 8 activity types (4 synced, 4 manual), server-side points with per-activity daily caps and a 0.5x multiplier for health activities typed in by hand, daily goal (placeholder 40 points), streaks, 9 achievements (one-time and daily, badges only), private communities with invite code and deep link, a week/today community leaderboard, rank on Home, profile stats, achievements and recent history, a `HealthSource` interface with a dev-only demo source, light/dark Fresh theme.

**Built differently from the first-pass plan below:**
- Points are computed by Postgres views and functions, not Edge Functions or a stored `daily_scores` table. Per-activity rules live in the `activity_types` table; the other tunable numbers are in a `scoring_rules` table. Both are mirrored in `src/config/scoring.ts` (a test checks they match).
- Entries are in `activity_logs` with `source` = `health` or `manual`.
- Free community limit is set to **1**, matching the Notion plan ("joining more than one community" is paid). It's one number in `free_community_limit()`.
- Tabs are Home, Ranks, Log (+, centered), You, Settings.
- Checks: `npm test` (Jest, pure scoring/streak/rest-day logic), `npm run test:db` (all migrations against an in-memory Postgres), `npm run typecheck`, `npx expo export --platform ios`. `npm run lint` (ESLint) passes. Migrations are applied with the Supabase CLI (`npm run db:push`).

**Added Nov 26:** live leaderboards and a community activity feed (Supabase Realtime on `community_events`), member profiles that respect privacy settings, profile photos (Supabase Storage `avatars` bucket), privacy toggles (streak, achievements, per-activity), history by week/month/year and seasons (a season = one calendar month; community leaderboards can show current and past seasons), activity trends (last 7 days vs the 4 weeks before), achievements show date earned and a placeholder point value, larger Apple Health/Fitness-style layout. All profile editing lives in Settings.

**Added Nov 27 (point mechanics):**
- Manual entries earn full points (the 0.5x multiplier is set to 1 for every activity; a different anti-cheating approach comes later). Per-activity daily caps still apply.
- Sleep: 1 point per hour, capped at 9 (partial hours round down).
- Achievement points count: each badge's `bonus_points` is added to the day it was earned, so it shows in today/week/season totals, streak minimums and every leaderboard.
- Rest days: one per week (Monday to Sunday), planned before that week starts (deadline: end of the Sunday before), cancellable until then. A rest day keeps a streak alive without adding to it. `profiles.extra_rest_days` raises the weekly allowance for a future paid plan (not editable from the app).
- Time zone is saved on the profile and used for the rest-day deadline.

**Added Nov 27 (finishing the structure, PRs #7 to #10):**
- `npm run lint` passes. Supabase CLI set up and linked to the hosted project: `npm run db:status` / `npm run db:push` apply migrations in order (CLI v3 needs `--remote`, already in the scripts).
- Settings → Appearance: System / Light / Dark, remembered on the device.
- Forgot password (sign-in screen and Settings): emailed 6-digit code → new password. Supabase's Reset Password template sends `{{ .Token }}`, and email goes through custom SMTP (Gmail for now).
- Settings → Password: change password (checks the current one).
- Settings → Delete account (last on the page, type DELETE to confirm): `delete_my_account()` removes the account and its data; communities they created pass to the earliest member.
- Tested on the phone: live leaderboard with two accounts, profile photo upload, appearance, password reset, delete account.

**The app's structure is complete.** Next is the "Fresh" design pass.

**Not built yet:** buying extra rest days, weekly recap card, checking achievements on a schedule (today they're checked when the app logs or syncs), reopening on the last tab after a full quit (decided not needed), Phase 7 (Apple Developer account: Sign in with Apple, privacy policy, HealthKit, TestFlight).

## Product

**Pitch:** a group chat that keeps your friends healthy. A points-based app where you and your friends earn points for living well (moving, sleeping, eating right, studying, seeing people) and compete in private groups.

**Audience:** college students to early-career young adults who want to build better habits and have fun doing it.

**Priority:** growth before money. Almost everything is free.

**Launch:** one place first so it feels busy: Irvine or Texas A&M (College Station). Spread through Sato's socials, invite links, shareable recaps, and local small businesses.

**Platform:** iOS first, built with React Native + Expo so it can be developed and tested without a Mac (Expo Go on iPhone). Android later.

## MVP features

### Accounts and profile
- Sign up, log in, log out (email to start; Sign in with Apple before App Store launch).
- Profile: display name, avatar, time zone, privacy settings.
- Profile history of activities with a range picker: day (default), week, month, year.

### Activities and points
Two kinds of entries:
- **Synced** (from Apple Health, through the `HealthSource` interface): steps, workouts, sleep, active calories. Full points.
- **Manual** (typed in): water, meals, study time, social hangouts. Same points as synced entries for now; per-activity daily caps keep anyone from typing their way to the top.

All point values below are placeholders, stored in one config and tuned after real use.

### Healthy limits (product rules)
- Daily point cap per activity, so one huge workout or a 30,000-step day doesn't break the leaderboard.
- Manual entries earn the same as synced ones for now (no manual penalty).
- No rewards for extremes: sleep earns 1 point per hour and tops out at 9, nothing for very low calories or overtraining.
- Social and study points are capped too, so the app rewards balance over grinding one thing.

### Achievements
- One-time achievements (e.g. "walk a mile a day for 7 days") give bonus points once.
- Daily achievements can be earned again each day.
- Achievement points are added to the day they're earned and count toward every total and ranking.

### Streaks
- Streak for days with at least the streak minimum (placeholder 10 points).
- One planned rest day per week (Monday to Sunday) keeps the streak alive. It must be planned before the week starts. More rest days can be bought later.

### Communities (private only in MVP)
- Create a community, invite by code or link, join, leave.
- Community leaderboard that updates live (Supabase Realtime).
- Tap a member to see their profile (stats, recent activity, achievements), respecting their privacy settings.
- Free users can be in a limited number of communities (placeholder: 1). No payments yet; just enforce the limit.

### Home
- Today's progress toward the daily goal, today's activities, current streak, and your rank in your community.

### Navigation
Bottom tabs: Home, Add Activity, Community, Profile, Settings.

### Settings and privacy
- Edit profile, sign out, light/dark mode.
- Choose which activity types other members can see.
- Health data is never sold or used for ads.

## Data model (first pass)

| Table | Holds |
| --- | --- |
| `profiles` | one row per user: name, avatar, time zone, privacy flags |
| `activity_types` | steps, workouts, sleep, water... with unit and whether it can be synced |
| `scoring_rules` | points per unit, daily cap, manual multiplier, healthy range per activity type |
| `activity_entries` | what a user logged: type, amount, `source` (healthkit/manual), time |
| `daily_scores` | points per user per local day, computed on the server |
| `achievements` / `user_achievements` | achievement definitions and who earned what, when |
| `streaks` | current and best streak, rest days used |
| `communities` / `community_members` | groups, invite code, owner, members and role |

Every table has Row Level Security. Points and scores are only written by server-side functions.

## Build order (MVP)

Each phase should end with something running on Sato's iPhone in Expo Go.

### Phase 0: Setup
- Scaffold Expo app (TypeScript, Expo Router), ESLint, Prettier, Jest, `typecheck`/`lint`/`test` scripts.
- Theme tokens file and ThemeProvider (Fresh: sage accent, Manrope, white cards, hairline borders, ~22px radius, light/dark).
- Base components: Screen, Card, Button, Text, Input.
- Create the Supabase project, add `.env.example`, Supabase client with secure session storage.
- **Done when:** the app opens in Expo Go with themed placeholder tabs.

### Phase 1: Accounts
- Sign up / log in / log out with email. Auth-gated routing.
- `profiles` table + RLS, created automatically on sign-up. Profile edit screen (name, avatar, time zone).
- **Done when:** a new user can sign up, sign out, and sign back in on the phone.

### Phase 2: Logging activities
- `activity_types`, `scoring_rules`, `activity_entries` tables + RLS, seed data.
- `HealthSource` interface with `MockHealthSource` and `ManualHealthSource`.
- Add Activity screen: pick a type, enter an amount (manual), or "sync" from the mock source.
- **Done when:** entries save to Supabase and show up in today's list.

### Phase 3: Points and healthy limits
- Server-side scoring (Edge Function or Postgres function): points per entry, per-activity daily caps, manual multiplier and cap, healthy-range limits.
- `daily_scores` table. Pure scoring functions with unit tests covering caps and extremes.
- Home shows today's points and progress toward the daily goal.
- **Done when:** logging an activity updates today's points, and caps are enforced on the server.

### Phase 4: Streaks and achievements
- Streak logic with rest days (pure functions + tests), streak shown on Home.
- Achievement definitions (a starter set of one-time and daily), awarding on the server, a simple "achievement earned" moment in the UI.
- **Done when:** hitting the goal several days in a row grows the streak, and a rest day doesn't break it.

### Phase 5: Communities and leaderboard
- `communities`, `community_members` + RLS (members-only visibility).
- Create, join by code or link (Expo deep link), leave. Enforce the free limit.
- Live leaderboard via Realtime. Member profile view with privacy respected.
- Home shows your rank in your community.
- **Done when:** two test accounts in the same community see each other's scores update live.

### Phase 6: Profile history and polish
- Profile history with day/week/month/year ranges.
- Settings: privacy toggles, dark mode, sign out.
- Empty states, loading states, error messages, basic accessibility (labels, text sizes).
- **Done when:** the MVP loop works end to end and feels finished enough to hand to friends.

### Phase 7: Ready for real iPhones (needs Apple Developer account)
- EAS development build, `HealthKitSource` implementing `HealthSource` (steps, workouts, sleep, active calories) with clear permission prompts.
- Sign in with Apple, privacy policy, App Store privacy details (HealthKit data never used for ads).
- TestFlight build for the launch group.

## Later (not MVP)

- Shareable weekly recap card for Instagram/TikTok stories (first thing after MVP; doubles as advertising).
- Global monthly seasons with opt-in public profiles; skill-based leagues (Bronze/Silver/Gold).
- Improvement scoring: points for beating your own baseline.
- Team vs team challenges (friend group vs friend group, dorm floor vs dorm floor).
- Public communities and community discovery.
- Group-chat-style notifications ("Alex just passed you in steps").
- Quests: limited-time, location-verified (phone location or QR code at the business), with local business sponsors.
- Map: opt-in, fuzzed locations, home and frequent places never shown.
- Big life events category (scored fairly, e.g. group approval).
- Cosmetics (profile themes, badges, recap card styles); invite rewards.
- Paid: community customization (custom point values, events, quests) and joining more communities.
- Android.
