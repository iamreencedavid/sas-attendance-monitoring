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

## Troubleshooting

| Message | Fix |
|---|---|
| `Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY` | `.env.local` is missing or empty. Repeat step 2. |
| `The staff table doesn't exist yet` | Run `npm run db:push` (step 5). |
| `The key was rejected` | Use the **secret** key (`sb_secret_…`), not the publishable one. |
| `Cannot find project ref` on `db:push` | Run the link command from step 4. |

## Adding schema changes later

```bash
npx supabase migration new <short_name>   # creates supabase/migrations/<timestamp>_<short_name>.sql
# write the SQL in that file
npm run db:push
```

Never edit a migration that has already been pushed. Add a new one instead.
