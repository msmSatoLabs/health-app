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

The database is built from the SQL scripts in `supabase/migrations/`. Each one is a single change (new tables, new rules), and the date at the start of the name sets the order. The **Supabase CLI** (installed by `npm install`) applies them for you, in order, and remembers which ones it has already run, so nothing gets skipped or run twice.

1. Find your **project ref**: it's the part of your project URL before `.supabase.co` (in `https://abcd1234.supabase.co` it's `abcd1234`).
2. In PowerShell, in the `health-app` folder:
   ```powershell
   npx supabase login
   ```
   A browser tab opens; approve it. This lets the CLI talk to your Supabase account. You only do it once per computer.
3. Connect this folder to your project (it asks for the database password you saved):
   ```powershell
   npm run db:link -- --project-ref abcd1234
   ```
4. Apply every script that hasn't been run yet:
   ```powershell
   npm run db:push
   ```
   It lists the scripts it will run and asks you to confirm.

Whenever a new script shows up in `supabase/migrations/` (for example after pulling new code), run `npm run db:push` again. `npm run db:status` shows which scripts the project has (Remote column) next to the ones in the repo (Local column).

**Already ran the scripts by hand in the SQL Editor?** The CLI doesn't know that yet and would try to run them again. Tell it they're done, once, right after step 3:

```powershell
npx supabase migration repair --status applied 20261125000000 20261125010000 20261126000000 20261127000000
```

Then `npm run db:status` should show all four in both columns, and from then on `npm run db:push` only runs new scripts.

Want to see what it made? Open **Table Editor** in Supabase: you'll see `activity_types` (the activity list and point values) and `achievements` already filled in.

### Make sign-up easy while testing

By default Supabase emails a confirmation link before a new account can sign in. For testing, turn that off: **Authentication → Sign In / Providers → Email**, switch off **Confirm email**, and save. Turn it back on before real users join.

### Password reset emails (once)

"Forgot password?" emails a code that the person types into the app. A typed code works the same in Expo Go, in Safari and in the real app, while email links can't reliably open the app during development. Supabase's standard reset email only has a link, so add the code to it:

1. In Supabase, open **Authentication → Emails → Templates** (older dashboards: **Authentication → Email Templates**) and pick **Reset Password**.
2. Set the subject to `Your Pulse password reset code`.
3. Replace the message body with:
   ```html
   <h2>Reset your password</h2>
   <p>Enter this code in the app:</p>
   <p style="font-size: 28px; font-weight: bold; letter-spacing: 4px;">{{ .Token }}</p>
   <p>The code works for 1 hour. If you didn't ask to reset your password, you can ignore this email.</p>
   ```
4. Save.

**Who gets emails:** Supabase's built-in email sender only delivers to members of your Supabase team, and only a few emails per hour. That's fine for testing with your own account. Before friends or real users rely on sign-up confirmation or password resets, connect a real email service under **Authentication → Emails → SMTP Settings** (for example Resend, which has a free tier).

## 4. Connect the app to Supabase

1. In Supabase, click **Connect** at the top. Under "Set environment variables" you need two values:
   - `SUPABASE_URL` (looks like `https://abcd1234.supabase.co`)
   - `SUPABASE_PUBLISHABLE_KEY` (starts with `sb_publishable_`)

   Ignore the "Install package" and "skill" steps there; they're for a different kind of project. **Do not copy `SUPABASE_SECRET_KEY`.** (Older Supabase projects call these the Project URL and the **anon public** key; that works too.)
2. In the `health-app` folder, copy `.env.example` to a new file named `.env`:
   ```powershell
   copy .env.example .env
   ```
3. Open `.env` (in Notepad is fine) and paste your two values after the `=` signs, with no spaces or quotes. The publishable key goes on the `ANON_KEY` line:
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://abcd1234.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
   ```

The publishable (anon) key is meant to be in the app; the database's security rules protect the data. Never put the **secret** key (called **service_role** in older projects) in the app or share it. `.env` is already ignored by Git, so it won't be uploaded.

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
4. On the **Settings** tab, turn on **Demo health data**, then tap **Sync health** on Home to fill in fake steps, sleep and workouts.

## Changing point values

All the tunable numbers are tables you can edit in Supabase's **Table Editor**. Changes apply immediately and also recalculate past days.

- `activity_types`: points per unit, daily cap and biggest single entry for each activity.
- `achievements`: `bonus_points` for each badge.
- `scoring_rules`: daily goal (40), streak minimum (10), free community limit (1), rest days per week (1), and how far ahead a rest day can be planned (35 days).

The app keeps a copy of these numbers in `src/config/scoring.ts` for its points previews. Table Editor changes are fine for trying things out. To make a change permanent, ask Claude to add it as a new migration file (then `npm run db:push`) and update `scoring.ts` to match (`npm test` checks that the two agree).

## Apple Health (later)

Expo Go can't read Apple Health, because that needs native code built into the app. The code is ready for it (`src/health/`), with demo data standing in for now. When you get an Apple Developer account ($99/year), you'd build a "development build" of the app in the cloud with EAS (no Mac needed) and fill in `src/health/healthKitSource.ts`. The comments in that file list the steps.

## Troubleshooting

- **"Supabase isn't connected yet" on the sign-in screen:** the `.env` file is missing or has a typo. Fix it, then stop Expo (Ctrl+C) and run `npx expo start --clear`.
- **"permission denied for table ..." or "function ... does not exist":** the database is missing a script. Run `npm run db:status`, then `npm run db:push`, then pull down on Home to refresh.
- **Profile photo won't upload, or leaderboards don't update live:** make sure `npm run db:status` shows `20261126000000` under Remote. For live updates, also check **Database → Publications → supabase_realtime** includes `community_events`.
- **Reset code email never arrives:** check spam, wait a minute, then tap **Send a new code**. If it still doesn't come, the address probably isn't on your Supabase team (see "Password reset emails" above). The app always says a code is on its way, on purpose, so nobody can use it to find out which emails have accounts.
- **"That code is wrong or has expired":** use the code from the newest email; each new code replaces the last one.
- **"Email not confirmed":** see "Make sign-up easy while testing" above.
- **Expo Go says the project needs a newer/older SDK:** update Expo Go from the App Store.
- **`db:push` says "relation ... already exists":** that script was already run by hand. Mark it as applied with `npx supabase migration repair --status applied <its date number>` (see step 3), then push again.
- **Type check:** `npm run typecheck` finds mistakes in the code without running it.
