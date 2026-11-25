# PLAN.md

Product plan and MVP build order. Working conventions are in [CLAUDE.md](CLAUDE.md). The longer-form plan lives in Notion (Projects / Health app / Plan); this file is the version to build from.

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
- **Manual** (typed in): water, meals, study time, social hangouts. Fewer points and their own daily cap so nobody can type their way to the top.

All point values below are placeholders, stored in one config and tuned after real use.

### Healthy limits (product rules)
- Daily point cap per activity, so one huge workout or a 30,000-step day doesn't break the leaderboard.
- Manual entries earn less than synced ones and have a separate daily cap.
- No rewards for extremes: sleep points top out in a healthy range (about 7 to 9 hours), nothing for very low calories, very little sleep, or overtraining.
- Social and study points are capped too, so the app rewards balance over grinding one thing.

### Achievements
- One-time achievements (e.g. "walk a mile a day for 7 days") give bonus points once.
- Daily achievements can be earned again each day.

### Streaks
- Streak for hitting the daily goal.
- A planned rest day keeps the streak alive (placeholder: one rest day per week).

### Communities (private only in MVP)
- Create a community, invite by code or link, join, leave.
- Community leaderboard that updates live (Supabase Realtime).
- Tap a member to see their profile (stats, recent activity, achievements), respecting their privacy settings.
- Free users can be in a limited number of communities (placeholder: 3). No payments yet; just enforce the limit.

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
- Create, join by code or link (Expo deep link), leave. Enforce the free limit of 3.
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
