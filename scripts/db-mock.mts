// Mock punches for reviewing the admin pages: one shift per active staff
// member per day, 2026-09-25 to 2026-09-30, in Manila time.
// Run with: npm run db:mock              (add; skips shifts that already exist)
//           npm run db:mock -- --delete  (remove every mock row, nothing else)
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;
if (!url || !secretKey) {
  console.error("✖ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY in .env.local (see .env.example).");
  process.exit(1);
}
const supabase = createClient(url, secretKey, { auth: { persistSession: false } });

const TAG = "mock-seed";
const DATES = ["2026-09-25", "2026-09-26", "2026-09-27", "2026-09-28", "2026-09-29", "2026-09-30"];
const UTC_OFFSET = "+08:00"; // Asia/Manila has no DST

function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

/** Shop wall time (minutes from that date's midnight, may pass 24h) → ISO instant. */
function at(date: string, minutes: number, seconds: number): string {
  return new Date(Date.parse(`${date}T00:00:00${UTC_OFFSET}`) + minutes * 60_000 + seconds * 1000).toISOString();
}

type Kind = "on_time" | "overtime" | "late" | "early_leave";

/** Fixed pattern so the data reads the same every run: ~1 in 4 overtime, ~1 in 5 late, one early leave. */
function kindOf(k: number): Kind {
  if (k === 13) return "early_leave";
  if (k % 4 === 1) return "overtime";
  if (k % 5 === 3) return "late";
  return "on_time";
}

async function remove() {
  const { data, error } = await supabase
    .from("punches")
    .delete()
    .or(`user_agent.eq.${TAG},photo_path.like.mock/%`)
    .select("id");
  if (error) throw new Error(`Delete failed: ${error.message}`);
  console.log(`✔ Deleted ${data.length} mock punches. Real punches were not touched.`);
}

async function add() {
  if ((process.env.SHOP_TIMEZONE || "Asia/Manila") !== "Asia/Manila") {
    throw new Error("This script writes Manila times; SHOP_TIMEZONE is set to something else.");
  }
  const { data: staff, error } = await supabase
    .from("staff")
    .select("id, name, shift_start, shift_end, saturday_start, saturday_end, saturday_off")
    .eq("active", true)
    .order("name");
  if (error) throw new Error(`Loading staff failed: ${error.message}`);

  const { data: existing, error: existingError } = await supabase
    .from("punches")
    .select("photo_path")
    .eq("user_agent", TAG)
    .eq("type", "in");
  if (existingError) throw new Error(`Loading existing mock punches failed: ${existingError.message}`);
  const done = new Set(existing.map((p) => p.photo_path));

  const rows: Record<string, unknown>[] = [];
  const summary: Record<Kind, number> = { on_time: 0, overtime: 0, late: 0, early_leave: 0 };

  staff.forEach((s, si) => {
    DATES.forEach((date, di) => {
      const inPath = `mock/${s.id}/${date}-in.jpg`;
      if (done.has(inPath)) return;
      // Saturdays use the Saturday shift when set; staff who are off get no mock shift.
      const saturday = new Date(`${date}T00:00:00Z`).getUTCDay() === 6;
      if (saturday && s.saturday_off) return;
      const ownSaturday = saturday && s.saturday_start && s.saturday_end;
      const start = toMinutes((ownSaturday ? s.saturday_start : s.shift_start).slice(0, 5));
      let end = toMinutes((ownSaturday ? s.saturday_end : s.shift_end).slice(0, 5));
      if (end <= start) end += 24 * 60; // overnight shift

      const k = si * DATES.length + di;
      const kind = kindOf(k);
      summary[kind]++;
      const inMin = kind === "late" ? start + 5 + ((k * 11) % 36) : start - ((k * 7) % 6);
      const outMin =
        kind === "overtime" ? end + 60 + ((k * 17) % 91) : kind === "early_leave" ? end - 45 : end + ((k * 3) % 11);

      const base = { staff_id: s.id, source: "kiosk", user_agent: TAG };
      rows.push({ ...base, type: "in", punched_at: at(date, inMin, (k * 13) % 60), photo_path: inPath });
      rows.push({ ...base, type: "out", punched_at: at(date, outMin, (k * 29) % 60), photo_path: `mock/${s.id}/${date}-out.jpg` });
    });
  });

  if (rows.length === 0) {
    console.log("✔ Nothing to add: every mock shift already exists.");
    return;
  }
  const { error: insertError } = await supabase.from("punches").insert(rows);
  if (insertError) throw new Error(`Insert failed: ${insertError.message}`);
  console.log(`✔ Inserted ${rows.length} mock punches (${rows.length / 2} shifts) for ${staff.map((s) => s.name).join(", ")}.`);
  console.log(`  On time ${summary.on_time} · Overtime ${summary.overtime} · Late ${summary.late} · Early leave ${summary.early_leave}`);
  console.log("  Remove them with: npm run db:mock -- --delete");
}

(process.argv.includes("--delete") ? remove() : add()).catch((err: unknown) => {
  console.error(`✖ ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
