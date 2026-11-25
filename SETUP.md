# Setup guide

This gets the app running on your iPhone from a Windows PC. No Mac or Apple Developer account needed. Plan on about 20 minutes the first time.

## What you're setting up

- **The app** runs on your phone through **Expo Go**, a free app that loads your code over Wi-Fi while you develop.
- **Supabase** is the backend: a hosted database plus sign-in. Think of it as a set of connected spreadsheets in the cloud, with rules about who can see which rows. The app talks to it over the internet.

## 1. Install the tools (once)

1. Install **Node.js LTS** from https://nodejs.org (accept the defaults).
2. Install **Git** from https://git-scm.com/download/win.
3. On your iPhone, install **Expo Go** from the App Store.

## 2. Get the code

Open **PowerShell** and run:

```powershell
git clone https://github.com/msmSatoLabs/health-app.git
cd health-app
npm install
```

`npm install` downloads the libraries the app uses into a `node_modules` folder. It takes a minute or two.

## 3. Create the Supabase project (once)

1. Go to https://supabase.com, sign up (free), and click **New project**. Pick any name and a database password (save it somewhere), and the region closest to you (West US).
2. Wait a minute for it to finish setting up.

### Create the database tables

1. In the left sidebar, open **SQL Editor**, then **New query**.
2. Open `supabase/migrations/20261125000000_initial_schema.sql` from this repo in any text editor, copy everything, paste it into the editor, and click **Run**.
3. You should see "Success. No rows returned". That one file creates every table, the points rules, and the security rules. Only run it once per project.

Want to see what it made? Open **Table Editor**: you'll see `activity_types` (the activity list and point values) and `achievements` already filled in.

### Make sign-up easy while testing

By default Supabase emails a confirmation link before a new account can sign in. For testing, turn that off: **Authentication → Sign In / Providers → Email**, switch off **Confirm email**, and save. Turn it back on before real users join.

## 4. Connect the app to Supabase

1. In Supabase, open **Project Settings → API** (or click **Connect** at the top). Copy the **Project URL** and the **anon public** key.
2. In the `health-app` folder, copy `.env.example` to a new file named `.env`:
   ```powershell
   copy .env.example .env
   ```
3. Open `.env` and paste your two values:
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://abcd1234.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
   ```

The anon key is meant to be in the app; the database's security rules protect the data. Never put the **service_role** key in the app. `.env` is already ignored by Git, so it won't be uploaded.

## 5. Run it on your iPhone

```powershell
npx expo start
```

A QR code appears in PowerShell. Open the iPhone **Camera**, point it at the QR code, and tap the banner to open it in Expo Go. Your phone and PC need to be on the same Wi-Fi. If it can't connect (common on school Wi-Fi), stop it with Ctrl+C and run `npx expo start --tunnel` instead.

Edit any file and save: the app on your phone updates in a second or two.

## 6. Try it out

1. Create an account in the app.
2. Tap **+** and log some water or study time. Your points ring on Home fills up.
3. Go to **Ranks**, create a community, and send the code to a friend (or make a second account to test).
4. On the **You** tab, turn on **Demo health data**, then tap **Sync health** on Home to fill in fake steps, sleep and workouts.

## Changing point values

Point values, daily caps and the "manual earns half" rule live in the `activity_types` table. Edit them right in Supabase's **Table Editor**: changes apply immediately and also recalculate past days. The daily goal (40), streak minimum (10) and free community limit (1) are small functions at the top of the SQL file; edit the number and re-run just that `create or replace function ...` statement.

## Apple Health (later)

Expo Go can't read Apple Health, because that needs native code built into the app. The code is ready for it (`src/health/`), with demo data standing in for now. When you get an Apple Developer account ($99/year), you'd build a "development build" of the app in the cloud with EAS (no Mac needed) and fill in `src/health/healthKitSource.ts`. The comments in that file list the steps.

## Troubleshooting

- **"Supabase isn't connected yet" on the sign-in screen:** the `.env` file is missing or has a typo. Fix it, then stop Expo (Ctrl+C) and run `npx expo start --clear`.
- **"Email not confirmed":** see "Make sign-up easy while testing" above.
- **Expo Go says the project needs a newer/older SDK:** update Expo Go from the App Store.
- **Type check:** `npm run typecheck` finds mistakes in the code without running it.
