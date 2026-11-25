# CLAUDE.md

Guidance for Claude Code when working in this repo.

## What this is

A gamified health app for college students and young adults: log healthy activities, earn points (with daily caps), keep streaks, earn achievements, and compete with friends in private communities. Pitch: "a group chat that keeps your friends healthy." Product plan: [PLAN.md](PLAN.md). No app name yet; "Pulse" is a placeholder (`src/lib/config.ts`, `app.json`).

## About the owner

- Sato builds on **Windows** with an **iPhone**. No Mac and no Apple Developer account yet, so everything must work in **Expo Go**. Never require Xcode or a local iOS build.
- Sato is **new to backends**. Explain database, auth and security changes in plain language, and keep [SETUP.md](SETUP.md) accurate whenever setup steps change.
- **Open questions go in chat, not in docs.** Don't add "open questions" or TODO lists for Sato to PLAN.md, the README, or Notion; ask directly.
- Prefers small, working steps over big drops. Finish a piece so it runs on the phone before starting the next.
- Growth before money. Don't build payments yet.

## Stack

- React Native + Expo SDK 58, TypeScript (strict), Expo Router (file-based routes in `src/app/`).
- Supabase: Postgres, email/password auth, Row Level Security, SQL functions (RPCs). Client: `@supabase/supabase-js` with AsyncStorage sessions.
- Fonts: Manrope via `@expo-google-fonts/manrope`. Icons: `@expo/vector-icons` (MaterialCommunityIcons), mapped through `src/components/Icon.tsx`.

## Commands

```bash
npm install
npx expo start            # dev server; scan the QR code with the iPhone camera (Expo Go)
npx expo start --tunnel   # if phone and PC can't see each other on Wi-Fi
npm run typecheck         # tsc --noEmit; run before finishing any change
npm test                  # Jest unit tests (scoring, streaks, rest days, config vs SQL)
npm run test:db           # migrations + rule checks on an in-memory Postgres
npm run lint              # ESLint (some older screens still have errors)
npx expo install <pkg>    # ALWAYS use this to add packages (picks SDK-compatible versions)
npx expo export --platform ios   # quick check that the bundle builds
```

Expo changes between SDK versions; check the docs for the installed major version (https://docs.expo.dev/versions/v58.0.0/) rather than relying on memory. Only libraries bundled in Expo Go can be used until there's a development build.

## Layout

```
src/app/                 Expo Router screens (every file is a route)
  _layout.tsx            root stack, fonts, auth provider
  sign-in.tsx            sign in / create account
  (tabs)/                Home (index), Ranks, Log (+, centered), You, Settings
  community/[id].tsx     community leaderboard + invite
  join.tsx               invite deep link: healthapp://join?code=ABC123
src/components/          ui.tsx (Text, Card, Button, Input, Chip, ...), Icon, Ring
src/theme/theme.ts       ALL colors, radii, spacing, fonts (light + dark)
src/lib/                 supabase client, api.ts (every Supabase call), auth, dates, types
src/health/              HealthSource interface; HealthKit stub; demo data for Expo Go
supabase/migrations/     SQL schema; run in the Supabase SQL editor
```

## Conventions

- **Design: "Fresh" direction.** Calm and airy, one sage-green accent (#2E9C73 light / #4CC596 dark), white cards with hairline borders and **no shadows**, 22px card corners, pill buttons, Manrope, light and dark mode. Mockups: https://claude.ai/artifact/JwGB5rHJCaS6rP44mmUQWU
- **Never hard-code colors or radii in screens.** Use `useTheme()` from `src/theme/theme.ts`. Add new tokens there.
- Use the shared components in `src/components/ui.tsx` before writing new styled views. With custom fonts, change weight via `fontFamily` (`font.bold`, etc.), not `fontWeight`.
- **All Supabase calls go through `src/lib/api.ts`.** Keep `src/lib/types.ts` in sync with the SQL.
- Screens load data with `useLoad()` (reloads on focus, supports pull-to-refresh).
- Dates sent to the database are the phone's **local** day (`localDay()` in `src/lib/dates.ts`).
- TypeScript strict, functional components and hooks, small files. When scoring or streak logic grows on the client, keep it in pure functions separate from UI so it can be unit tested.
- Small commits with clear messages. Never commit `.env`; keep `.env.example` up to date.

## Backend rules

- **Points are computed in the database, never in the app.** `activity_logs` stores raw amounts; `daily_activity_points` applies rates and daily caps; `daily_points` adds achievement `bonus_points` on the day each badge was earned (`user_achievements.day`). `estimatePoints()` in the app is only a preview.
- Placeholder tuning lives in data: `activity_types` (points_per_unit, daily_cap, manual_multiplier (currently 1 everywhere), max_per_entry), `achievements.bonus_points`, and the `scoring_rules` table (daily goal, streak minimum, free community limit, rest days per week, rest-day planning window), read through `rule()` / `daily_goal()` / `streak_min_points()` / `free_community_limit()`. `src/config/scoring.ts` mirrors all of it and `src/config/scoring.test.ts` fails if they drift.
- Scoring, streak and rest-day rules also exist as pure functions in `src/features/{points,streaks,rest-days}/logic.ts` with Jest tests. When a rule changes, change the SQL, the logic file and the tests together.
- Rest days: `rest_days` table, changed only through `plan_rest_day()` / `cancel_rest_day()`, which use the profile's `time_zone` for the deadline. `streak_for()` skips planned rest days.
- Every table has RLS on. Users see only their own logs; friends see totals only through `community_leaderboard()`. Communities are created and joined only via `create_community()` / `join_community()` (they enforce the free limit).
- Schema changes: add a **new** file in `supabase/migrations/` (don't edit one that's already been run), make it safe to paste into the SQL editor, and tell Sato in plain words what to run.
- Never put the Supabase service_role key in the app or the repo.

## Healthy limits and privacy (product rules, not polish)

- Daily cap per activity; manual entries currently earn the same as synced ones (Sato's decision; a different anti-cheating approach comes later); no rewards for extremes (sleep is 1 point per hour up to 9, nothing for very low calories or overtraining); one planned rest day per week keeps a streak alive.
- Health data is sensitive: collect only what a feature needs, never use it for ads. Location is off by default and fuzzed when shown. Public profiles and global rankings are opt-in.

## Apple Health

Screens only use the `HealthSource` interface (`src/health/types.ts`). `healthKitSource.ts` is a stub until there's a development build (needs an Apple Developer account; build with EAS in the cloud). The demo source only runs in `__DEV__` and only when switched on in the Settings tab. Health-synced and typed-in activities currently earn the same points.

## Testing the database locally

`npm run test:db` runs every migration against an in-memory Postgres (PGlite) with a tiny `auth`/`storage` shim, then checks scoring, achievement points, rest days, streaks and permissions as real `authenticated` users. Add checks to `supabase/tests/db-checks.mjs` when you change SQL rules.

## Out of scope for now

Payments, global rankings and leagues, public communities, quests, the map, cosmetics, big life events, Android-specific work. See PLAN.md "Later" before adding any of these. PLAN.md's "Where things stand" section lists what's built and what's next.
