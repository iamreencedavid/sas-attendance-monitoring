# PRD: SAS Coffee Attendance Monitoring

| | |
|---|---|
| **Status** | Draft, awaiting owner review |
| **Date** | 2026-10-01 |
| **Author** | Reence David (with Claude) |
| **Repo** | `sas-attendance-monitoring` (Next.js 16.3 scaffold) |

---

## 1. Summary

SAS Coffee needs a simple, reliable way to record when each staff member starts and ends a shift. There are 5+ staff. A shared tablet at the counter runs a single **kiosk page**. A staff member picks their name, enters a PIN, and taps **PUNCH IN** or **PUNCH OUT**. The camera captures a photo at that moment, and the punch is saved only after the photo uploads. The owner signs in on a separate **login page** to review records with photo thumbnails, see hours worked, manage staff, and export CSV.

The photo is **proof of presence** that stops "buddy punching" (someone clocking in for an absent coworker). It is not face recognition.

## 2. Goals and non-goals

### Goals
1. A staff member completes a punch in **under 10 seconds** from walking up to the tablet.
2. **Every** staff punch has a photo. No photo means no punch.
3. The owner can answer "who worked when, and for how long?" for any day or date range in under a minute.
4. Running costs stay at **$0/month** on free tiers for a shop of 5–15 staff.

### Non-goals (v1)
- Face recognition or automatic identity matching
- Schedules, shift planning, late or overtime rules, payroll calculation
- Staff-facing mobile app, or staff logging in on their own phones
- Geofencing or GPS
- Multiple branches
- Offline punching (the kiosk needs internet; see §10)

## 3. Users

| Persona | Device | Needs |
|---|---|---|
| **Staff** (barista, cashier) | Shared counter tablet | Punch in/out fast, with hands possibly busy, and no account to remember beyond a PIN |
| **Owner** | Own phone or laptop, plus the tablet once for setup | Trust the records, see hours, fix mistakes, add or remove staff |

## 4. Assumptions

- Exactly one owner account in v1. More admins can be added later through Supabase Auth.
- The **server clock is the source of truth** for punch times. The tablet's clock is never trusted.
- Shop timezone is set with an env var (`SHOP_TIMEZONE`, an IANA name such as `Asia/Manila`). All "day" groupings use it.
- Shifts may cross midnight. A punch pair counts toward the day of the IN punch.
- The kiosk tablet has a front camera and a modern browser (Chrome/Safari) served over HTTPS.

## 5. Tech stack

| Concern | Choice |
|---|---|
| Framework | **Next.js 16.3** App Router, React 19.2, Server Components + Server Actions |
| Language | **TypeScript** (strict) |
| Styling | **Tailwind CSS v4** (CSS-first `@theme`, no config file) |
| Database | **Supabase Postgres** |
| Photo storage | **Supabase Storage**, private bucket `punch-photos` |
| Owner auth | **Supabase Auth** (email + password) via `@supabase/ssr` |
| DB access | `@supabase/supabase-js` with generated types (`supabase gen types`) |
| Migrations | Supabase CLI SQL migrations in `supabase/migrations/` |
| PIN hashing | `bcryptjs` (pure JS, no native build step) |
| Kiosk cookie signing | `jose` (HS256 JWT) |
| Hosting | Vercel (Hobby) + Supabase (Free) |
| Tests | Vitest (unit), Playwright (e2e with fake camera) |

### 5.1 Prisma or Supabase?

**Recommendation: Supabase, without Prisma, for v1.**

They don't really compete. Prisma is an **ORM**: it gives you a typed query layer over a database, but it doesn't provide a database, file storage, or authentication. Supabase is a **backend platform** that includes Postgres, blob storage, auth, and row-level security. This app needs all three:

- **Photo blobs** need object storage. With Prisma you'd still need S3, R2, or Vercel Blob, plus a separate auth library. That means three vendors instead of one.
- **Owner login** comes ready-made with Supabase Auth.
- **Schema is tiny** (4 tables), so the generated Supabase types give enough type safety without a second schema language.
- **Free tier** (500 MB DB, 1 GB storage) easily covers a single shop. See §11 for the storage maths.

**When to add Prisma later:** if reporting queries become complex, or if you want Prisma's migration workflow. Prisma can sit on top of the same Supabase Postgres, so this choice is reversible.

## 6. Pages and routes

| Route | Who | Purpose |
|---|---|---|
| `/` | Kiosk device | **Kiosk punch page** (the single staff-facing page). Requires a valid kiosk cookie; otherwise redirects to `/login`. |
| `/login` | Owner | Email/password sign-in |
| `/admin` | Owner | Punch records, hours, CSV export |
| `/admin/staff` | Owner | Add, edit, deactivate staff; reset PINs |
| `/admin/kiosk` | Owner | "Use this device as kiosk"; list and revoke kiosk devices |
| `/api/export` | Owner | CSV download (Route Handler) |

`proxy.ts` (Next 16's replacement for `middleware.ts`) does fast redirects for missing cookies only. **Every Server Action and Route Handler checks auth itself**, because proxy is not a security boundary.

## 7. Kiosk page (Layout A, chosen)

### 7.1 Wireframe

```
┌──────────────────────────────────────────────────────────────────┐
│ ☕ SAS COFFEE                              Wed, Oct 1 · 07:58 AM │
├──────────────────────────────────────────┬───────────────────────┤
│                                          │  Name   [ Maria    ▾] │
│                                          │  PIN    [ ● ● ● ●   ] │
│         LIVE CAMERA PREVIEW              │ ┌───────────────────┐ │
│          ( face guide oval )             │ │    PUNCH  IN      │ │
│                                          │ │      (green)      │ │
│    "Center your face in the oval"        │ └───────────────────┘ │
│                                          │ ┌───────────────────┐ │
│                                          │ │    PUNCH  OUT     │ │
│                                          │ │       (red)       │ │
│                                          │ └───────────────────┘ │
├──────────────────────────────────────────┴───────────────────────┤
│ Photos are taken for attendance only · kept 90 days              │
└──────────────────────────────────────────────────────────────────┘
```

- **Tablet landscape**: camera takes about 60% of the width, controls 40%. **Portrait or phone**: camera on top, controls below.
- Buttons are at least 72px tall with a large font, easy to hit with wet or gloved hands.
- **The button that doesn't apply is disabled.** After a name is picked, the page shows that person's current state ("Clocked out since 9:02 PM yesterday"). PUNCH OUT is greyed out if they're clocked out, and PUNCH IN if they're clocked in. The server enforces the same rule.
- PIN entry uses an on-screen numeric keypad (`inputMode="numeric"`, masked) that appears when the PIN field is focused.
- Palette: cream `#f6efe6`, espresso `#2b1d14`, caramel `#c68b59`, IN green `#2f7d4f`, OUT red `#b4472c`. These are added as Tailwind `@theme` tokens.

### 7.2 Punch flow

1. **Idle:** camera preview is live, name not selected, both buttons disabled.
2. Staff picks a **name**, and the client loads that staff member's current state.
3. Staff enters a **PIN** (4–6 digits).
4. Staff taps the enabled **PUNCH IN/OUT** button.
5. Client **captures a frame**: it draws the `<video>` frame to a `<canvas>` scaled to a max width of 640px, then calls `canvas.toBlob(cb, "image/jpeg", 0.7)`. The result is a ~40–80 KB **JPEG Blob**, never base64.
6. Client sends `FormData { staffId, pin, type, photo: Blob }` to the `punch` Server Action.
7. Server (details in §8.3) verifies the kiosk, PIN, and state, uploads the blob, and inserts the punch.
8. **Success screen** for 3s: the captured photo, "✅ Maria — IN at 7:58 AM", and a short sound. The page then resets to idle and clears the name and PIN.
9. **Failure**: a clear inline message (see §10), with the name kept and the PIN cleared.

Auto-reset: if a name is selected but nothing happens for 30s, the page returns to idle.

## 8. Backend design

### 8.1 Data model (Postgres)

```sql
create table staff (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  pin_hash         text not null,
  active           boolean not null default true,
  failed_pin_count int not null default 0,
  locked_until     timestamptz,
  created_at       timestamptz not null default now()
);

create table kiosk_devices (
  id          uuid primary key default gen_random_uuid(),
  label       text not null,             -- e.g. "Counter iPad"
  created_at  timestamptz not null default now(),
  revoked_at  timestamptz
);

create type punch_type   as enum ('in', 'out');
create type punch_source as enum ('kiosk', 'manual');

create table punches (
  id          uuid primary key default gen_random_uuid(),
  staff_id    uuid not null references staff(id),
  type        punch_type not null,
  punched_at  timestamptz not null default now(),
  photo_path  text,                      -- null when manual, or after retention purge
  photo_purged_at timestamptz,           -- set by the retention job
  source      punch_source not null default 'kiosk',
  device_id   uuid references kiosk_devices(id),
  note        text,                      -- required when source = 'manual'
  created_at  timestamptz not null default now(),
  constraint photo_required check (
    source = 'manual' or photo_path is not null or photo_purged_at is not null
  ),
  constraint manual_note    check (source = 'kiosk'  or note is not null)
);
create index punches_staff_time on punches (staff_id, punched_at desc);
create index punches_time       on punches (punched_at desc);
```

**RLS is enabled on every table with no policies**, so the anon key can read or write nothing. All data access goes through server code using the **service-role key**, which is never sent to the browser, after the server has checked the owner session or kiosk cookie.

**Storage:** private bucket `punch-photos`, object key `{staffId}/{yyyy-mm-dd}/{punchId}.jpg` (date in shop timezone). It has no public access. The owner views photos through **signed URLs** that last 1 hour, generated in batches with `createSignedUrls`.

### 8.2 Kiosk device auth

1. The owner signs in on the tablet, opens `/admin/kiosk`, and taps **"Use this device as kiosk"**, giving it a label.
2. The server inserts a `kiosk_devices` row and sets a cookie `kiosk` = signed JWT `{ deviceId }`. The cookie is httpOnly, Secure, SameSite=Lax, and lasts 1 year.
3. The server then **signs the owner out** on that device and redirects to `/`. Staff therefore can never reach `/admin` from the kiosk.
4. Each kiosk action checks the JWT signature **and** that the device has `revoked_at is null`. The owner can revoke a lost tablet from `/admin/kiosk`.

### 8.3 `punch` Server Action, step by step

1. Verify the kiosk cookie. If it's invalid, return an error (no detail).
2. Validate the input: `staffId` is a uuid, `type` is in/out, `pin` is 4–6 digits, and `photo` is a Blob that is ≤ 500 KB and `image/jpeg`, with JPEG magic bytes `FF D8 FF`.
3. Load the staff member. They must be `active`. If `locked_until > now()`, return "Too many attempts, try again in N min".
4. `bcrypt.compare(pin, pin_hash)`. On failure, increment `failed_pin_count`; at **5 failures**, set `locked_until = now() + 5 min`. On success, reset the count.
5. **State check**: the last punch's type must be the opposite of `type` (no prior punch means only `in` is allowed). **Exception:** if the last punch is an IN older than **16h** (a forgotten OUT), the person counts as clocked out, so `in` is allowed and the old shift is flagged "missing OUT" in admin. Reject if the last punch was under **60s** ago (double tap).
6. Generate `punchId`, then **upload the blob** to Storage with the service role.
7. **Insert the punch row** with `punched_at = now()` (DB clock). If the insert fails, **delete the uploaded object** so there are no orphans.
8. Return `{ name, type, punchedAt }`.

Steps 5–7 must not race when the same person double-taps. A per-staff advisory lock (`pg_advisory_xact_lock`) inside a small SQL function `record_punch(...)` handles this: it re-checks the state and inserts in one transaction, and the upload happens just before the call.

Photo size is far below Next's default **1 MB Server Action body limit**, so no config change is needed.

### 8.4 Owner pages

**`/admin` (records)**
- Filters: date range (default today), staff (default all).
- A table of punches with thumbnails (signed URLs). Tapping a thumbnail opens a lightbox with the full image.
- A **Daily hours** view that groups by staff and day. It pairs each IN with the next OUT and sums the durations.
- **Missing OUT flag**: an IN with no OUT after 16h is highlighted.
- **Add correction**: a manual punch (staff, type, time, required note) with `source='manual'` and no photo, shown with a "manual" badge.
- **Export CSV** (`/api/export?from&to&staff`): one row per shift with columns `staff, date, in_time, out_time, hours, in_source, out_source`.

**`/admin/staff`**
- List, add (name + initial PIN), rename, deactivate or reactivate, reset PIN (owner types a new PIN), and unlock.
- Deactivated staff disappear from the kiosk name list, but their history is kept.

### 8.5 Login page (Layout L1, chosen)

```
┌──────────────────────────────────────┐
│                                      │
│          ┌──────────────────┐        │
│          │        ☕         │        │
│          │    SAS Coffee    │        │
│          │  Owner sign in   │        │
│          │                  │        │
│          │ Email            │        │
│          │ [______________] │        │
│          │ Password         │        │
│          │ [______________] │        │
│          │ [    Sign in   ] │        │
│          │ Forgot password? │        │
│          └──────────────────┘        │
│                                      │
└──────────────────────────────────────┘
```

- A centered card on the cream background, matching the kiosk palette. It's the same layout on every screen size.
- "Forgot password?" uses Supabase's password-reset email.
- Generic error text ("Email or password is incorrect"). Supabase Auth's rate limits apply.
- An already-signed-in owner is redirected to `/admin`.
- The page shows **no** shop activity data.

## 9. Project structure (target)

```
app/
  page.tsx                  # kiosk (server: load active staff) → <KioskClient/>
  login/page.tsx
  admin/layout.tsx          # owner guard
  admin/page.tsx            # records
  admin/staff/page.tsx
  admin/kiosk/page.tsx
  api/export/route.ts
components/kiosk/
  CameraPreview.tsx         # getUserMedia + capture() → Blob
  PunchPanel.tsx            # name, PIN, IN/OUT buttons
  PunchResult.tsx
lib/
  supabase/server.ts        # service-role client (server-only)
  supabase/ssr.ts           # owner session client (@supabase/ssr)
  auth/kiosk.ts             # sign/verify kiosk JWT, device check
  auth/owner.ts             # requireOwner()
  punch/rules.ts            # pure: nextAllowedType(), isDoubleTap(), pairShifts()
  punch/actions.ts          # 'use server' punch()
  time.ts                   # SHOP_TIMEZONE helpers
proxy.ts
supabase/migrations/
```

`lib/punch/rules.ts` is pure and has no I/O, so the IN/OUT logic and hour calculations can be unit-tested directly.

## 10. Error handling

| Situation | Behaviour |
|---|---|
| Camera permission denied or no camera | Full-panel message "Camera needed to punch, ask the owner", with buttons disabled. **No photo-less punches from the kiosk.** |
| Page served over plain HTTP | `getUserMedia` is unavailable, so the page shows the same message. Production is always HTTPS. |
| Wrong PIN | "Wrong PIN" with attempts left. Lockout after 5 failures for 5 min. |
| Wrong button (e.g. OUT while clocked out) | The button is disabled client-side. The server also rejects it with "You're not clocked in". |
| Double tap within 60s | Rejected with "Already punched at 7:58". |
| Photo upload fails | "Couldn't save photo, tap to retry." No row is written. |
| Row insert fails after upload | The object is deleted and a generic error is shown with retry. |
| Network offline | Banner "No internet: punches unavailable", with buttons disabled. Staff tell the owner, who adds a manual correction. |
| Kiosk cookie invalid or revoked | Redirect to `/login`. |
| Forgot to punch out | Flagged in admin after 16h. The owner adds a manual OUT with a note. |

## 11. Privacy, security, and retention

- A notice on the kiosk footer reads "Photos are taken for attendance only · kept 90 days". The owner should tell staff in writing, per local privacy law.
- **Photo retention: 90 days** (`PHOTO_RETENTION_DAYS`). A daily job (Vercel Cron → Route Handler protected by `CRON_SECRET`) deletes older objects and sets `photo_path = null, photo_purged_at = now()`. The `photo_required` check allows this. Punch rows are kept indefinitely for payroll history, and the admin shows "photo expired" in place of the thumbnail.
- Storage maths: 15 staff × 2 punches × 30 days × ~60 KB ≈ **54 MB/month**, or about 160 MB at 90-day retention. That's well within the 1 GB free tier.
- Secrets: `SUPABASE_SERVICE_ROLE_KEY`, `KIOSK_JWT_SECRET`, and `CRON_SECRET` are server-only env vars and never `NEXT_PUBLIC_`.
- PINs are only ever stored as bcrypt hashes (cost 10). The owner cannot view a PIN, only reset it.

## 12. Testing

- **Unit (Vitest):** `rules.ts`, covering next allowed type, double-tap window, shift pairing across midnight, missing-OUT detection, and hours sums. Also `kiosk.ts` sign/verify and PIN lockout logic.
- **E2E (Playwright):** Chromium with `--use-fake-device-for-media-stream --use-fake-ui-for-media-stream` against a local Supabase (`supabase start`).
  - Kiosk happy path: IN, then OUT, and both rows and photos exist.
  - Wrong PIN, then lockout.
  - Camera denied blocks punching.
  - Owner: login, see punches with thumbnails, add correction, export CSV.

## 13. Success metrics

- Median kiosk punch time is **under 10s** (measured by timing the e2e flow and by watching real staff in week 1).
- **100%** of kiosk punches have a photo (DB check: `source='kiosk' and photo_path is null and photo_purged_at is null` returns 0 rows).
- Missing-OUT flags drop to fewer than 2 per week after the first month.
- The owner reconciles a week's hours in under 5 minutes using CSV export.

## 14. Milestones

1. **Foundation:** Supabase project, migrations, types, env, Tailwind tokens.
2. **Owner auth + staff management:** `/login` (L1), `/admin/staff`.
3. **Kiosk:** device enrolment, camera capture, `punch` action, Layout A UI.
4. **Records:** `/admin` table, thumbnails, hours, corrections, CSV.
5. **Hardening:** retention cron, e2e tests, deploy to Vercel, enrol the counter tablet.

---

## Appendix: layouts considered

Five kiosk layouts were mocked up as tablet-landscape wireframes. **A was chosen.**

| | Layout | Why not chosen |
|---|---|---|
| **A** | Big live camera + name, PIN, two big IN/OUT buttons | ✅ Chosen. One screen with no navigation; the wrong-button risk is removed by disabling the button that doesn't apply. |
| B | Staff avatar grid → PIN keypad → full-screen camera countdown | Three steps, slower than A |
| C | Split screen: always-on camera left, PIN + one smart button right | Close second; the owner preferred explicit IN/OUT buttons |
| D | "Who's on shift" board of staff cards with tap-to-punch | Shows more than a punch screen needs |
| E | Clock-centric idle screen with one giant PUNCH button | Least feedback about who is punching |

Login: **L1 (centered card)** was chosen over L2 (split brand panel + form).
