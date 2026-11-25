# CLAUDE.md

Working guide for Claude Code in this repo. The product plan and build order are in [PLAN.md](PLAN.md). Read it before starting a phase.

## What this is

A gamified, points-based health app: "a group chat that keeps your friends healthy." Users earn points for living well (moving, sleeping, eating, studying, seeing people) and compete with friends in private communities. Audience: college students to early-career young adults. iOS first. No app name yet, so use the working name `health-app` and keep the display name in one config value (`app.config.ts`) so it is easy to change.

## About the owner (Sato)

- New to backends and to React Native. Explain backend and database changes in plain language: what a table, policy, or function does and why it is needed. Short, not a lecture.
- Has **no Mac and no Apple Developer account**. Everything must be testable on a real iPhone through **Expo Go** on Windows/Linux. Do not suggest Xcode, CocoaPods, or `expo run:ios`.
- Ask open product questions in chat. Do not write open questions or TODO lists of decisions into docs.
- Prefers small, working steps over big drops. Finish a phase so it runs before starting the next.

## Stack

- **App:** React Native + Expo (managed workflow), TypeScript (strict), Expo Router for navigation.
- **Backend:** Supabase: Auth (email first, Sign in with Apple later), Postgres, Realtime (live leaderboards), Row Level Security, Edge Functions (Deno/TypeScript) for points logic.
- **Client libs:** `@supabase/supabase-js`, `@tanstack/react-query` for server state, `zustand` only if local UI state gets complicated, `expo-secure-store` for the auth session.
- **Health data:** Apple HealthKit needs native code, so it **cannot run in Expo Go**. It will need an EAS development build (needs an Apple Developer account). Until then, all health data goes through a `HealthSource` interface with a mock/manual implementation (see Conventions).
- **Tests:** Jest + `jest-expo`, React Native Testing Library. Points/caps logic must have unit tests.

## Commands

The project is not scaffolded yet. Phase 0 in PLAN.md sets it up. Once it is:

```bash
npm install                 # install dependencies
npx expo start              # dev server; scan the QR code with Expo Go on iPhone
npx expo start --tunnel     # use if the phone and computer are on different networks
npm test                    # Jest
npm run lint                # ESLint
npm run typecheck           # tsc --noEmit
npx supabase start          # local Supabase (needs Docker); optional, the hosted project also works
npx supabase migration new <name>   # create a new SQL migration
npx supabase db push        # apply migrations to the hosted project
npx supabase gen types typescript --project-id <id> > src/lib/database.types.ts
```

Run `npm run typecheck`, `npm run lint`, and `npm test` before calling a step done.

## Project structure (target)

```
app/                    Expo Router screens
  (auth)/               sign-in, sign-up
  (tabs)/               home, add-activity, community, profile, settings
src/
  theme/                tokens.ts (all colors, spacing, radii, type), ThemeProvider
  components/           shared UI (Card, Button, ProgressRing, LeaderboardRow...)
  features/             one folder per feature: activities, points, achievements,
                        streaks, communities, profile
  health/               HealthSource interface + mock and manual implementations
  lib/                  supabase client, database.types.ts, query client, utils
  config/               scoring.ts (point values and caps), limits.ts (free tier limits)
supabase/
  migrations/           SQL migrations (schema + RLS policies), one change per file
  functions/            Edge Functions (e.g. log-activity, compute-daily-score)
  seed.sql              activity types, achievements, dev data
```

## Conventions

- **Points are computed on the server.** The app sends raw activity entries; an Edge Function or Postgres function applies point values, daily caps, and the verified/manual difference. The client never writes to points or leaderboard tables directly. This stops cheating by editing the app.
- **RLS on every table**, enabled in the same migration that creates the table. Default deny. Community data is visible only to members. Write a one-line comment above each policy saying who it allows.
- **Placeholder numbers live in one place:** `src/config/scoring.ts` mirrored in a `scoring_rules` table (point values, per-activity daily caps, manual multiplier, sleep healthy range, free community limit = 3). Never hard-code a point value in a component or query. Real values get tuned after launch.
- **Healthy limits are product rules, not polish:** daily caps per activity, manual entries earn less than synced ones and have their own daily cap, no points beyond healthy ranges (sleep tops out around 7 to 9 hours, no reward for very low calories or overtraining), and a planned rest day keeps a streak alive.
- **HealthSource interface:** `src/health/HealthSource.ts` defines `getSteps(range)`, `getWorkouts(range)`, `getSleep(range)`, `getActiveCalories(range)`, `requestPermissions()`. Ship `MockHealthSource` (fake data, dev only) and `ManualHealthSource` (user enters numbers, marked as manual). A `HealthKitSource` comes later with the dev build. Screens only talk to the interface.
- **Entries carry a `source`** of `healthkit` or `manual` so scoring can treat them differently.
- **Dates:** store timestamps in UTC; "a day" for caps and streaks is the user's local day, so store the user's time zone on their profile.
- **Design ("Fresh" direction):** minimal and airy. White cards with 1px hairline borders and no shadows, about 22px card corners, pill-shaped buttons, a single sage-green accent (`#2E9C73` light, `#4CC596` dark), Manrope font (`@expo-google-fonts/manrope`), light mode default with dark mode. **Every color, radius, spacing, and font size comes from `src/theme/tokens.ts`.** No hex values in components. Reference mockups: https://claude.ai/artifact/JwGB5rHJCaS6rP44mmUQWU. Small touches from other directions are fine (e.g. a gradient for level-ups, bold blocks for shareable recaps).
- **Privacy:** health data is sensitive. Collect only what a feature needs, never use it for ads, keep location off by default and fuzzed when shown. Public profile and global rankings are opt in.
- **Secrets:** Supabase URL and anon key go in `.env` as `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` (these are safe to ship in the app because RLS protects data). The service role key is **never** in the app, only in Edge Function secrets. Keep `.env.example` up to date.
- **Code style:** TypeScript strict, functional components and hooks, named exports, small files. Keep business logic (scoring, streaks) in pure functions in `src/features/*/logic.ts` with tests, separate from UI.
- **Git:** small commits with clear messages. Do not commit `.env`.

## Out of scope for now

Payments, global rankings and leagues, public communities, quests, the map, cosmetics, big life events, Android-specific work. See PLAN.md "Later" before adding any of these.
