# Product plan

The living version is in Notion (Projects / Health app / Plan). This is the summary Claude Code works from.

## Pitch

A group chat that keeps your friends healthy. A points-based app where you and your friends earn points for living well (moving, sleeping, eating right, studying, seeing people) and compete in groups.

## Audience

Young adults: college students to early-career workers who want to build better habits and have fun doing it.

## Priorities

1. Get users and exposure first. Money comes second.
2. iOS first. Built with React Native + Expo so it can be developed from Windows without a Mac. Android later, once the idea is proven.
3. Backend: Supabase.

## MVP (first version)

- Account sign-up / sign-in and a profile.
- Activities that earn points:
  - Synced from Apple Health (full points): steps, workouts, sleep, active calories.
  - Logged by hand (lower points, capped): water, healthy meals, study time, social hangouts.
- Daily point cap per activity. Typing in a health activity by hand earns less than syncing it.
- Daily goal and a home screen showing today's progress and your rank in your group.
- Streaks.
- Achievements: one-time (e.g. first log, 7-day streak) and daily (e.g. hydrated, well rested).
- Private communities with an invite code / link, and a community leaderboard.
- Profile with stats, achievements and activity history.
- Free users can be in a limited number of communities (placeholder: 1). No payments yet.
- Bottom bar: Home, Ranks, Add activity (+), You.

## Later

- Global monthly rankings (opt-in, public profiles only), split into skill-based leagues, with part of the score from beating your own baseline.
- Public communities and finding/joining them.
- Community customization: custom point values, events ("most steps this weekend"), custom quests, team vs team challenges (dorm vs dorm, club vs club).
- Quests: limited-time events, including sponsored ones at local businesses, verified by location or a QR code at the business.
- Map of where you and your community completed activities (opt-in, fuzzed locations, never home).
- Weekly shareable recap card for Instagram/TikTok stories.
- Group-chat-style notifications ("Alex just passed you in steps").
- Rest days that keep a streak alive.
- Achievements that award bonus points.
- History time ranges (day, week, month, year).
- Big life events category (new job, finished a project), scored fairly, e.g. by group vote.
- More activities, such as screen time.
- Cosmetics shop.
- Android.

## Scoring and healthy limits

- Apple Health (verified) data is worth more than manual entries. Manual points are capped per day.
- Every activity has a daily point cap, so one huge workout or a 30,000-step day can't break the leaderboard.
- No rewards for extremes: no points for very low calories, very little sleep, or overtraining. Sleep points top out in a healthy range (about 7 to 9 hours) instead of "more is better".
- Rest days count toward streaks.
- Social, study and similar points are capped so the app rewards balance, not grinding one thing.
- Exact point values and big-event scoring are decided after development, once there's real usage. Current values are placeholders.
- Points are calculated on the server so nobody can cheat by editing the app.

## Seasons

Global rankings reset monthly.

## Privacy and safety

- Health data is sensitive: collect only what's needed, explain why, never sell it or use it for ads.
- Location is opt-in, off by default, and fuzzed on the map.
- Public profile and global rankings are opt-in.
- Apple's HealthKit rules apply before App Store submission (privacy policy required; no advertising use of HealthKit data).

## Monetization (later, never pay-to-win)

- Paid: community customization (custom points, events, quests) and joining more than one community.
- Free: everything else (tracking, points, achievements, rankings, streaks, recaps).
- Possible later: cosmetics (profile themes, badges, recap card styles) and sponsored quests once there are enough users.

## Launch and growth

- Launch in one place so it feels busy: Irvine (hometown) or Texas A&M in College Station.
- Invite links are the main growth engine (private groups only work with friends); maybe reward invites with a cosmetic.
- Shareable weekly recaps posted to stories.
- Sato's own social media to advertise and document building the app.
- Local small businesses: quests like "visit this coffee shop" or "take a class at this gym".
- College ideas: dorm or club challenges, partnering with student orgs and intramural sports.

## Design

"Fresh" style: minimal, white cards with thin borders, one sage-green accent, about 22px rounded corners, light and dark mode. Borrowing touches from the other explored directions is fine (a gradient for level-ups, bold blocks for shareable recaps). Mockups: https://claude.ai/artifact/JwGB5rHJCaS6rP44mmUQWU
