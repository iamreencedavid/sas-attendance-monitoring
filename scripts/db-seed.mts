// Seeds starting staff into Supabase. Safe to re-run: people who already
// exist (active, same name) are skipped and never overwritten.
// PINs come from .env.local so they are never committed.
// Run with: npm run db:seed
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";

type SeedStaff = {
  name: string;
  role: "barista" | "kitchen" | "barista_kitchen" | "supervisor" | "social_manager";
  shiftStart: string; // 24h HH:MM
  shiftEnd: string; // 24h HH:MM
  pinEnv: string; // .env.local variable holding this person's PIN
};

const SEED_STAFF: SeedStaff[] = [
  { name: "Angelie", role: "supervisor", shiftStart: "06:00", shiftEnd: "14:00", pinEnv: "SEED_PIN_ANGELIE" },
];

const ROLES = ["barista", "kitchen", "barista_kitchen", "supervisor", "social_manager"];
const TIME_24H = /^([01]\d|2[0-3]):[0-5]\d$/;
const PIN = /^\d{4,6}$/;

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;

if (!url || !secretKey) {
  console.error(
    "✖ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in .env.local (see .env.example).",
  );
  process.exit(1);
}

const supabase = createClient(url, secretKey, { auth: { persistSession: false } });

type DbError = { code?: string; message: string };

function hint(error: DbError): string {
  if (error.code === "42P01" || error.code === "PGRST205") {
    return "The staff table doesn't exist yet. Run: npm run db:push";
  }
  if (/invalid api key|jwt|unauthorized/i.test(error.message)) {
    return "The key was rejected. Check SUPABASE_SECRET_KEY (it starts with sb_secret_).";
  }
  return "";
}

function dbFailure(action: string, error: DbError): Error {
  const tip = hint(error);
  return new Error(`${action} failed: ${error.message}${tip ? `\n  Hint: ${tip}` : ""}`);
}

/** Validate every entry before touching the database, so a bad entry writes nothing. */
function validate(staff: SeedStaff[]): string[] {
  const problems: string[] = [];
  for (const s of staff) {
    if (!s.name.trim()) problems.push("A seed entry has an empty name.");
    if (!ROLES.includes(s.role)) problems.push(`${s.name}: role must be one of ${ROLES.join(", ")}.`);
    if (!TIME_24H.test(s.shiftStart) || !TIME_24H.test(s.shiftEnd)) {
      problems.push(`${s.name}: shift times must be 24h HH:MM.`);
    } else if (s.shiftStart === s.shiftEnd) {
      problems.push(`${s.name}: shift start and end can't be the same.`);
    }
    if (!PIN.test(process.env[s.pinEnv] ?? "")) {
      problems.push(`${s.name}: set ${s.pinEnv}=<4–6 digits> in .env.local.`);
    }
  }
  return problems;
}

/** Escape LIKE wildcards so ilike() does an exact, case-insensitive match. */
function exactIlike(value: string): string {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`);
}

async function main() {
  const problems = validate(SEED_STAFF);
  if (problems.length) {
    throw new Error(`Nothing was seeded:\n  - ${problems.join("\n  - ")}`);
  }

  console.log(`→ Seeding ${SEED_STAFF.length} staff into ${url}`);
  let added = 0;
  let skipped = 0;

  for (const s of SEED_STAFF) {
    const name = s.name.trim();
    const label = `${name} · ${s.role} · ${s.shiftStart}–${s.shiftEnd}`;

    const { data: existing, error: findError } = await supabase
      .from("staff")
      .select("id")
      .eq("active", true)
      .ilike("name", exactIlike(name))
      .limit(1);
    if (findError) throw dbFailure(`Looking up ${name}`, findError);

    if (existing.length) {
      console.log(`• ${name} already exists, skipped`);
      skipped++;
      continue;
    }

    const { error: insertError } = await supabase.from("staff").insert({
      name,
      role: s.role,
      shift_start: s.shiftStart,
      shift_end: s.shiftEnd,
      pin_hash: await bcrypt.hash(process.env[s.pinEnv]!, 10),
    });
    if (insertError) throw dbFailure(`Adding ${name}`, insertError);

    console.log(`✔ Added ${label}`);
    added++;
  }

  console.log(`\n✅ Done: ${added} added, ${skipped} skipped.`);
}

main().catch((err: unknown) => {
  console.error(`\n✖ ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
