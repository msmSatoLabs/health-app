# health-app (working name: Pulse)

A mobile app that turns living a healthy life into a game you play with your friends. Think of it as a group chat that keeps your friends healthy.

> The app doesn't have a name yet. "Pulse" is a placeholder (`src/lib/config.ts` and `app.json`).

## The idea

- Log healthy activities (some synced from the phone's health data, some entered by hand) and earn points.
- Join a community with your friends, compete on leaderboards, and take on quests together.
- Healthy limits are built in: daily caps, no rewards for extremes, and rest days count.
- Global seasons reset monthly.

Who it's for: college students and early-career young adults. Full product plan: [PLAN.md](PLAN.md) (and in Notion: Projects / Health app / Plan).

## Tech stack

- **Mobile:** React Native + Expo (TypeScript, Expo Router), so the app can be built and tested without a Mac. iOS is the first target.
- **Backend:** Supabase (Postgres database, sign-in, security rules, database functions).

## Getting started

Follow **[SETUP.md](SETUP.md)**: create a free Supabase project, run one SQL file, add two keys to `.env`, and open the app on your iPhone with Expo Go.

## Status

First version (MVP) in progress: sign-in, activity logging with points and daily caps, streaks, achievements, private communities with invite codes and leaderboards, and profile history. Apple Health sync is wired behind an interface with demo data until a development build is set up.
