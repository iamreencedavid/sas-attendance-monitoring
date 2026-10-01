# Supabase setup

These steps connect this repo to a cloud Supabase project and create the `staff` table. You only do them once per project.

## 1. Create the project

1. Sign in at [supabase.com](https://supabase.com/dashboard) and click **New project**.
2. Name it `sip-and-simple`.
3. Choose a **strong database password** and save it in your password manager. The CLI asks for it in step 4.
4. Pick the region closest to the shop, then click **Create new project**. It takes about a minute to provision.

## 2. Copy the keys into `.env.local`

1. In the dashboard, open **Project Settings → API Keys**.
2. Copy `.env.example` to `.env.local` in the repo root:
   ```bash
   cp .env.example .env.local
   ```
3. Fill in the three values:

   | Variable | Where to find it |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | **Project URL**, e.g. `https://abcdefghijklmnop.supabase.co` |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | **Publishable key** (`sb_publishable_…`) |
   | `SUPABASE_SECRET_KEY` | **Secret key** (`sb_secret_…`). Click reveal to copy it. |

The secret key bypasses row-level security. Keep it in `.env.local` only, and never give it a `NEXT_PUBLIC_` prefix. `.env.local` is git-ignored.

> Supabase is deprecating the older `anon` / `service_role` keys by the end of 2026, so use the publishable and secret keys.

## 3. Log the CLI in

The Supabase CLI is installed as a dev dependency, so run it with `npx`:

```bash
npx supabase login
```

This opens your browser to approve a personal access token.

## 4. Link this repo to the project

Your **project ref** is the part of the Project URL before `.supabase.co`. For `https://abcdefghijklmnop.supabase.co`, the ref is `abcdefghijklmnop`.

```bash
npx supabase link --project-ref <your-project-ref>
```

Enter the database password from step 1 if the CLI asks for it.

## 5. Create the tables

```bash
npm run db:push
```

This applies every file in `supabase/migrations/` that the remote database hasn't seen yet. Type `Y` to confirm. Afterwards:

- Dashboard → **Table Editor** shows the `staff` table.
- `npx supabase migration list` shows the migration in both the *Local* and *Remote* columns.

## 6. Test the connection

```bash
npm run db:check
```

You should see output like this:

```
→ Connecting to https://abcdefghijklmnop.supabase.co
✔ Inserted staff 3f2c…
✔ Read back: DB Check 2026-… · barista · 06:00–14:00 · active=true
✔ PIN hash verifies
✔ Rejected as expected: role 'cashier' is not in the list (22P02)
✔ Rejected as expected: shift start equals end (23514)
✔ Rejected as expected: duplicate active name (23505)
✔ Test row deleted

✅ Supabase is connected and the staff table accepts data.
```

The script cleans up after itself, so the table is empty again when it finishes.

## 7. Seed starting staff

The seeder adds the starting staff listed in `SEED_STAFF` in `scripts/db-seed.mts`. Right now that's only Angelie (supervisor, 06:00–14:00).

1. Pick Angelie's PIN (4–6 digits) and add it to `.env.local`:
   ```
   SEED_PIN_ANGELIE=4821
   ```
   Only a bcrypt hash of the PIN goes into the database, and `.env.local` is never committed.
2. Run:
   ```bash
   npm run db:seed
   ```
   Expected output:
   ```
   → Seeding 1 staff into https://….supabase.co
   ✔ Added Angelie · supervisor · 06:00–14:00

   ✅ Done: 1 added, 0 skipped.
   ```
3. Check **Table Editor → staff** in the dashboard. You should see Angelie's row, with `pin_hash` starting with `$2`.

It's safe to run the seeder again. Anyone who already exists (an active staff member with the same name) is skipped, and their PIN and shift are left alone.

**To add another person**, add a line to `SEED_STAFF` in `scripts/db-seed.mts` and set their PIN variable in `.env.local`:

```ts
{ name: "Marco", role: "barista", shiftStart: "14:00", shiftEnd: "22:00", pinEnv: "SEED_PIN_MARCO" },
```

Then run `npm run db:seed` again.

## 8. Owner login

Only the owner signs in, at `/login`, with an email and password (Supabase Auth). The app lets a user into `/admin` only if their account is tagged `app_metadata.role = 'owner'`, and only the secret key can set that tag.

1. In the dashboard, open **Authentication → Sign In / Providers** and turn off **Allow new users to sign up**. Then nobody can create an account with the publishable key.
2. Add the owner's login to `.env.local`:
   ```
   OWNER_EMAIL=owner@example.com
   OWNER_PASSWORD=<at least 8 characters>
   ```
3. Run:
   ```bash
   npm run db:owner
   ```
   Expected output: `✔ Created owner account owner@example.com.` If the account already exists, the script sets the new password and the owner tag instead, so it's also how you change the password.
4. Remove `OWNER_PASSWORD` from `.env.local` if you don't want it kept on disk.

On Vercel, `/admin` needs the same `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` variables. `OWNER_*` are only for the script.

## Troubleshooting

| Message | Fix |
|---|---|
| `Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY` | `.env.local` is missing or empty. Repeat step 2. |
| `The staff table doesn't exist yet` | Run `npm run db:push` (step 5). |
| `The key was rejected` | Use the **secret** key (`sb_secret_…`), not the publishable one. |
| `Cannot find project ref` on `db:push` | Run the link command from step 4. |
| `set SEED_PIN_ANGELIE=<4–6 digits>` | Add that PIN variable to `.env.local` (step 7). |
| "Email or password is incorrect" for the owner | Run `npm run db:owner` again (step 8). It resets the password and the owner tag. |

## Adding schema changes later

```bash
npx supabase migration new <short_name>   # creates supabase/migrations/<timestamp>_<short_name>.sql
# write the SQL in that file
npm run db:push
```

Never edit a migration that has already been pushed. Add a new one instead.
