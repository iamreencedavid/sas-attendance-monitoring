// Connection smoke test for Supabase: insert a staff row, read it back,
// confirm the constraints reject bad data, then clean up.
// Run with: npm run db:check   (reads .env.local)
import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";

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

function hhmm(time: string): string {
  return time.slice(0, 5);
}

async function expectRejected(label: string, row: Record<string, unknown>) {
  const { data, error } = await supabase.from("staff").insert(row).select("id");
  if (error) {
    console.log(`✔ Rejected as expected: ${label} (${error.code})`);
    return;
  }
  await supabase.from("staff").delete().in("id", data.map((r) => r.id));
  throw new Error(`Expected "${label}" to be rejected, but it was saved.`);
}

async function main() {
  console.log(`→ Connecting to ${url}`);
  const pinHash = await bcrypt.hash("1234", 10);
  const base = { role: "barista", shift_start: "06:00", shift_end: "14:00", pin_hash: pinHash };
  const name = `DB Check ${new Date().toISOString()}`;

  const { data: inserted, error: insertError } = await supabase
    .from("staff")
    .insert({ ...base, name })
    .select("id")
    .single();
  if (insertError) {
    const tip = hint(insertError);
    throw new Error(`Insert failed: ${insertError.message}${tip ? `\n  Hint: ${tip}` : ""}`);
  }
  console.log(`✔ Inserted staff ${inserted.id}`);

  try {
    const { data: row, error: readError } = await supabase
      .from("staff")
      .select("name, role, shift_start, shift_end, pin_hash, active")
      .eq("id", inserted.id)
      .single();
    if (readError) throw new Error(`Read failed: ${readError.message}`);

    console.log(
      `✔ Read back: ${row.name} · ${row.role} · ${hhmm(row.shift_start)}–${hhmm(row.shift_end)} · active=${row.active}`,
    );
    if (!(await bcrypt.compare("1234", row.pin_hash))) throw new Error("PIN hash did not verify.");
    console.log("✔ PIN hash verifies");

    await expectRejected("role 'cashier' is not in the list", { ...base, name: `${name} x1`, role: "cashier" });
    await expectRejected("shift start equals end", { ...base, name: `${name} x2`, shift_end: "06:00" });
    await expectRejected("duplicate active name", { ...base, name });
  } finally {
    const { error: deleteError } = await supabase.from("staff").delete().eq("id", inserted.id);
    if (deleteError) console.error(`✖ Cleanup failed, delete ${inserted.id} by hand: ${deleteError.message}`);
    else console.log("✔ Test row deleted");
  }

  console.log("\n✅ Supabase is connected and the staff table accepts data.");
}

main().catch((err: unknown) => {
  console.error(`\n✖ ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
