# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project state

Sip and Simple attendance monitoring app. The spec is `docs/superpowers/specs/2026-10-01-attendance-monitoring-design.md`.

- `/` is the public punch page (components in `components/kiosk/`). The staff dropdown comes from Supabase (`lib/staff/queries.ts`), and the PIN is checked on the server (`lib/punch/actions.ts`). IN/OUT history is still kept in browser memory (`lib/punch/local.ts`).
- Supabase (cloud) is connected for the `staff` table only. The secret-key client is `lib/supabase/server.ts` (server-only). Migrations live in `supabase/migrations/`, and the setup steps are in `docs/setup/supabase.md`.
- `/admin/staff` is the owner's staff page (Roast Scale table + right-side `<dialog>` drawer, `components/admin/`, Server Actions in `lib/staff/actions.ts`). There is no login yet, and `lib/auth/owner.ts` currently allows everyone (open in production by owner choice) until owner auth lands.
- Not built yet: punches table, photo storage, owner auth, and a test runner. Update this file as those pieces land.

## Commands

- `npm run dev`: dev server at http://localhost:3000 (also rewrites the managed block in `AGENTS.md`)
- `npm run build`: production build, which also type-checks
- `npm run start`: serve the production build
- `npm run lint`: ESLint 9 flat config (`eslint.config.mjs`, Next core-web-vitals + TypeScript presets)
- `npx tsc --noEmit`: standalone type check
- `npm run db:push`: apply new `supabase/migrations/*.sql` to the linked Supabase project
- `npm run db:seed`: insert starting staff from `SEED_STAFF` in `scripts/db-seed.mts` (skips existing names; PINs from `SEED_PIN_*` in `.env.local`)
- `npm run db:check`: Supabase smoke test (inserts, reads and deletes a test staff row; needs `.env.local`, see `.env.example`)

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
