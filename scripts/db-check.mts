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

async function recordPunch(staffId: string, type: "in" | "out") {
  return supabase.rpc("record_punch", {
    p_id: crypto.randomUUID(),
    p_staff_id: staffId,
    p_type: type,
    p_photo_path: `${staffId}/db-check/${type}.jpg`, // never uploaded; the function doesn't read Storage
    p_user_agent: "db-check",
    p_timezone: process.env.SHOP_TIMEZONE || "Asia/Manila",
    p_ip: "203.177.12.4",
    p_city: "Quezon City",
    p_region: "00",
    p_country: "PH",
    p_latitude: 14.676,
    p_longitude: 121.0437,
  });
}

async function expectPunchRejected(label: string, staffId: string, type: "in" | "out", reason: string) {
  const { error } = await recordPunch(staffId, type);
  if (error?.message === reason) {
    console.log(`✔ Rejected as expected: ${label} (${reason})`);
    return;
  }
  throw new Error(`Expected "${label}" to fail with ${reason}, got ${error ? error.message : "success"}.`);
}

async function expectPunchRowRejected(label: string, row: Record<string, unknown>) {
  const { data, error } = await supabase.from("punches").insert(row).select("id");
  if (error) {
    console.log(`✔ Rejected as expected: ${label} (${error.code})`);
    return;
  }
  await supabase.from("punches").delete().in("id", data.map((r) => r.id));
  throw new Error(`Expected "${label}" to be rejected, but it was saved.`);
}

/** punches table, record_punch() rules and the photo bucket (PRD §8.1, §8.3). */
async function checkPunches(staffId: string) {
  const { data: bucket, error: bucketError } = await supabase.storage.getBucket("punch-photos");
  if (bucketError) throw new Error(`Bucket punch-photos missing (run npm run db:push): ${bucketError.message}`);
  if (bucket.public) throw new Error("Bucket punch-photos must be private.");
  console.log("✔ Bucket punch-photos exists and is private");

  await expectPunchRejected("OUT before any IN", staffId, "out", "not_in");

  const { data: punchedAt, error } = await recordPunch(staffId, "in");
  if (error) throw new Error(`record_punch IN failed: ${error.message}`);
  console.log(`✔ record_punch IN at ${punchedAt}`);

  await expectPunchRejected("second tap within 60s", staffId, "in", "double_tap");

  // Age the IN past the double-tap window to test the state rule on its own.
  await supabase
    .from("punches")
    .update({ punched_at: new Date(Date.now() - 2 * 60_000).toISOString() })
    .eq("staff_id", staffId);
  // The one-IN-per-day check runs first, so a second IN today reports in_today.
  await expectPunchRejected("IN while clocked in", staffId, "in", "in_today");

  const { data: row, error: readError } = await supabase
    .from("punches")
    .select("id, shift_start, shift_end, source, user_agent, ip_address, geo_city, geo_country")
    .eq("staff_id", staffId)
    .single();
  if (readError) throw new Error(`Reading the punch failed: ${readError.message}`);
  if (hhmm(row.shift_start) !== "06:00" || hhmm(row.shift_end) !== "14:00") {
    throw new Error(`Shift wasn't copied onto the punch (got ${row.shift_start}–${row.shift_end}).`);
  }
  console.log(`✔ Punch row: source=${row.source}, shift copied ${hhmm(row.shift_start)}–${hhmm(row.shift_end)}`);
  if (row.ip_address !== "203.177.12.4" || row.geo_city !== "Quezon City" || row.geo_country !== "PH") {
    throw new Error(`Location wasn't stored (got ${row.ip_address}, ${row.geo_city}, ${row.geo_country}).`);
  }
  console.log(`✔ Location stored: ${row.geo_city}, ${row.geo_country} · ${row.ip_address}`);

  const manual = { staff_id: staffId, type: "out", source: "manual", punched_at: new Date().toISOString() };
  await expectPunchRowRejected("manual punch without a note", manual);
  await expectPunchRowRejected("kiosk punch without a photo", { staff_id: staffId, type: "out" });

  const { error: voidError } = await supabase.from("punches").update({ voided_at: new Date().toISOString() }).eq("id", row.id);
  if (!voidError) throw new Error("Voiding without a reason was saved.");
  console.log(`✔ Rejected as expected: void without a reason (${voidError.code})`);

  const { error: voidOk } = await supabase
    .from("punches")
    .update({ voided_at: new Date().toISOString(), void_reason: "db-check" })
    .eq("id", row.id);
  if (voidOk) throw new Error(`Voiding failed: ${voidOk.message}`);
  await expectPunchRejected("OUT after the only IN was voided", staffId, "out", "not_in");

  // One IN per shop date: the voided IN doesn't count, a second real one does.
  const ageAll = () =>
    supabase
      .from("punches")
      .update({ punched_at: new Date(Date.now() - 2 * 60_000).toISOString() })
      .eq("staff_id", staffId)
      .is("voided_at", null);
  const again = await recordPunch(staffId, "in");
  if (again.error) throw new Error(`IN after a voided IN failed: ${again.error.message}`);
  console.log("✔ IN allowed again after the earlier IN was voided");
  await ageAll();
  const out = await recordPunch(staffId, "out");
  if (out.error) throw new Error(`record_punch OUT failed: ${out.error.message}`);
  console.log("✔ record_punch OUT");
  await ageAll();
  await expectPunchRejected("second IN on the same day", staffId, "in", "in_today");
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
    await expectRejected("negative daily rate", { ...base, name: `${name} x3`, daily_rate: -1 });
    await expectRejected("negative overtime rate", { ...base, name: `${name} x4`, overtime_rate: -0.01 });

    await checkPunches(inserted.id);
  } finally {
    // Punches first: staff_id is ON DELETE RESTRICT.
    await supabase.from("punches").delete().eq("staff_id", inserted.id);
    const { error: deleteError } = await supabase.from("staff").delete().eq("id", inserted.id);
    if (deleteError) console.error(`✖ Cleanup failed, delete ${inserted.id} by hand: ${deleteError.message}`);
    else console.log("✔ Test row deleted");
  }

  console.log("\n✅ Supabase is connected; staff and punches accept data and reject bad rows.");
}

main().catch((err: unknown) => {
  console.error(`\n✖ ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
