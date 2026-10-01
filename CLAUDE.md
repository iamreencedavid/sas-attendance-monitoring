# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project state

Sip and Simple attendance monitoring app. The spec is `docs/superpowers/specs/2026-10-01-attendance-monitoring-design.md`.

- `/` is the public punch page (components in `components/kiosk/`). The staff dropdown comes from Supabase (`lib/staff/queries.ts`). Punching goes through the `punch` Server Action (`lib/punch/actions.ts`): PIN check, photo upload to the private `punch-photos` bucket, then the `record_punch` SQL function (per-staff advisory lock, double-tap and IN/OUT state checks, and **one IN per shop date**: after IN + OUT both kiosk buttons are locked until tomorrow).
- Supabase (cloud) has the `staff` and `punches` tables and the `punch-photos` bucket. Punches are never deleted: mistakes are voided (`voided_at` + `void_reason`), missing ones are added as `source='manual'` with a note, and every punch copies the staff shift at insert. The secret-key client is `lib/supabase/server.ts` (server-only). Migrations live in `supabase/migrations/`, and the setup steps are in `docs/setup/supabase.md`.
- `/admin/staff` is the owner's staff page (Roast Scale table + right-side `<dialog>` drawer, `components/admin/`, Server Actions in `lib/staff/actions.ts`). There is no login yet, and `lib/auth/owner.ts` currently allows everyone (open in production by owner choice) until owner auth lands.
- `/admin` redirects to `/admin/dashboard`: today's status per active staff member as photo cards (Late / On shift / Not in yet / Done / Missing OUT, filter chips, right-side Sheet drawer; `components/admin/dashboard/`). Data: `lib/dashboard/queries.ts` (real punches, voided ignored, 1h signed photo URLs); status rules in `lib/dashboard/status.ts`. Late = no IN by shift start (no grace), which is an owner choice beyond the PRD. "Today" uses `SHOP_TIMEZONE` (`lib/time.ts`, default `Asia/Manila`).
- `/admin/monitoring` is the punch records page: one row per shift (IN paired with the next OUT, by the IN's shop date), filtered by `?staff=&from=&to=` (default today), with an edit drawer (`components/admin/monitoring/`, `lib/monitoring/`). Saving never edits a punch time: `updateShift` inserts a `source='manual'` punch (keeping the original `photo_path`) and then voids the original with `void_reason = "Edited: <note>"`. A missing OUT is added as a manual punch, and a note-only change updates `note` in place. A note is required whenever a time changes.
- Not built yet: owner auth, CSV export, the 90-day photo retention job, and a test runner. Update this file as those pieces land.

## Commands

- `npm run dev`: dev server at http://localhost:3000 (also rewrites the managed block in `AGENTS.md`)
- `npm run build`: production build, which also type-checks
- `npm run start`: serve the production build
- `npm run lint`: ESLint 9 flat config (`eslint.config.mjs`, Next core-web-vitals + TypeScript presets)
- `npx tsc --noEmit`: standalone type check
- `npm run db:push`: apply new `supabase/migrations/*.sql` to the linked Supabase project
- `npm run db:seed`: insert starting staff from `SEED_STAFF` in `scripts/db-seed.mts` (skips existing names; PINs from `SEED_PIN_*` in `.env.local`)
- `npm run db:check`: Supabase smoke test (a test staff row plus `record_punch` and punches constraint checks, all deleted afterwards; needs `.env.local`, see `.env.example`)

There is no test runner configured yet. `db:check` is the only database check.

## Stack and conventions

- **Next.js 16.3 App Router with React 19.2.** APIs differ from older Next versions. Check the bundled docs in `node_modules/next/dist/docs/01-app/` (getting-started, guides, api-reference) before using any Next API. Don't rely on memory.
- **Typed route helpers are global.** For example, `app/layout.tsx` uses `LayoutProps<"/">` without importing it. These types are generated into `.next/types` / `.next/dev/types` by `next dev`/`next build`.
- **Tailwind CSS v4** via `@tailwindcss/postcss`. There is no `tailwind.config.*`. Theme tokens are declared in CSS with `@theme inline` in `app/globals.css`. Light and dark colors come from the `--background`/`--foreground` CSS variables, which switch on `prefers-color-scheme`.
- Fonts (Geist / Geist Mono) are loaded with `next/font/google` in the root layout and exposed as CSS variables.
- Import alias: `@/*` maps to the repo root (not `src/`).
- **shadcn/ui on Base UI** (`components.json`, style `base-nova`). Generated components live in `components/ui/` and use `cn` from the `cn` package. Their theme variables in `app/globals.css` `:root` are mapped to the admin Roast Scale palette, and the app is light-only (no `.dark` block). Add components with `npx shadcn@latest add <name>`, then check `globals.css` wasn't overwritten.
- `components/ui/alert-dialog.tsx` is locally adjusted: `z-[60]` and `forceRender` on the backdrop, so confirms opened from inside the Sheet drawer sit above it and block it. Keep that when re-adding it.
- Kiosk colour tokens are `cream`, `espresso`, `caramel`, `latte`, `mocha`, `punch-in`, `punch-out`. Don't name a kiosk token `muted`, because shadcn owns that name.
- TypeScript `strict` mode is on.
