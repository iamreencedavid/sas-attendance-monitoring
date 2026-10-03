"use server";

import { revalidatePath } from "next/cache";
import { isAdmin } from "@/lib/auth/admin";
import { createAdminClient } from "@/lib/supabase/server";
import { TIME_24H } from "@/lib/staff/validation";
import { addDays, shopInstant, shopNow } from "@/lib/time";
import { NON_PUNCHING_ROLE, type PunchType } from "@/lib/punch/types";
import type { AddShiftField, AddShiftState, ShiftActionState, ShiftField } from "./types";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;
/** A minute of slack so "now" typed on the admin's clock isn't "in the future". */
const FUTURE_SLACK_MS = 60_000;

const NOT_ALLOWED: ShiftActionState = { ok: false, message: "Not available." };
const SAVE_FAILED: ShiftActionState = { ok: false, message: "Couldn't save. Try again." };

type StoredPunch = {
  id: string;
  staff_id: string;
  type: PunchType;
  punched_at: string;
  source: "kiosk" | "manual";
  note: string | null;
  photo_path: string | null;
  voided_at: string | null;
};

function str(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

async function loadPunch(id: string): Promise<StoredPunch | null> {
  if (!id) return null;
  if (!UUID.test(id)) throw new Error("Bad punch id");
  const { data, error } = await createAdminClient()
    .from("punches")
    .select("id, staff_id, type, punched_at, source, note, photo_path, voided_at")
    .eq("id", id)
    .single();
  if (error) throw new Error(`Loading punch failed: ${error.message}`);
  return data as StoredPunch;
}

/**
 * Saves the shift drawer. A changed time never edits a row: a manual punch
 * with the new time (keeping the original photo) is added first, then the
 * original is voided. A filled-in missing time adds a manual punch. A note
 * on its own is written onto the shift's punches.
 */
export async function updateShift(_prev: ShiftActionState, formData: FormData): Promise<ShiftActionState> {
  if (!(await isAdmin())) return NOT_ALLOWED;

  const staffId = str(formData, "staffId");
  const dateKey = str(formData, "dateKey");
  const inTime = str(formData, "inTime");
  const outTime = str(formData, "outTime");
  const note = str(formData, "note");
  if (!UUID.test(staffId) || !DATE_KEY.test(dateKey)) return SAVE_FAILED;

  let original: { in: StoredPunch | null; out: StoredPunch | null };
  try {
    original = { in: await loadPunch(str(formData, "inId")), out: await loadPunch(str(formData, "outId")) };
  } catch (err) {
    console.error(err);
    return SAVE_FAILED;
  }
  for (const p of [original.in, original.out]) {
    if (p && (p.staff_id !== staffId || p.voided_at)) {
      return { ok: false, message: "This shift changed meanwhile. Close the drawer and reload." };
    }
  }

  const current = {
    in: original.in ? shopNow(new Date(original.in.punched_at)).time : "",
    out: original.out ? shopNow(new Date(original.out.punched_at)).time : "",
  };
  const currentNote = original.in?.note ?? original.out?.note ?? "";

  const errors: Partial<Record<ShiftField, string>> = {};
  if (inTime && !TIME_24H.test(inTime)) errors.inTime = "Use 24-hour time, e.g. 08:00.";
  if (outTime && !TIME_24H.test(outTime)) errors.outTime = "Use 24-hour time, e.g. 16:00.";
  if (!inTime && original.in) errors.inTime = "IN can't be emptied. Change the time instead.";
  if (!outTime && original.out) errors.outTime = "OUT can't be emptied. Change the time instead.";
  if (!inTime && !outTime) errors.inTime = "Enter an IN time.";
  if (note.length > 300) errors.note = "Keep notes under 300 characters.";

  const inChanged = inTime !== current.in;
  const outChanged = outTime !== current.out;
  const timeChanged = inChanged || outChanged;
  if (timeChanged && !note) errors.note = "Add a note saying why the time changed.";
  const keepsManual = (original.in?.source === "manual" && !inChanged) || (original.out?.source === "manual" && !outChanged);
  if (!note && keepsManual) errors.note = "Edited punches need a note.";
  if (!timeChanged && note === currentNote) return { ok: false, message: "Nothing changed." };
  if (Object.keys(errors).length) return { ok: false, errors };

  // The shift date belongs to the IN, so an OUT at or before the IN time is the
  // next day. On a row with only an OUT, the date is the OUT's, so a later IN
  // time is the day before.
  const inDate = !original.in && original.out && inTime > outTime ? addDays(dateKey, -1) : dateKey;
  const inAt = inTime ? (inChanged ? shopInstant(inDate, inTime) : new Date(original.in!.punched_at)) : null;
  const outAt = outTime
    ? outChanged
      ? shopInstant(original.in && outTime <= inTime ? addDays(dateKey, 1) : dateKey, outTime)
      : new Date(original.out!.punched_at)
    : null;
  const limit = Date.now() + FUTURE_SLACK_MS;
  if (inAt && inAt.getTime() > limit) errors.inTime = "That time hasn't happened yet.";
  if (outAt && outAt.getTime() > limit) errors.outTime = "That time hasn't happened yet.";
  if (inAt && outAt && outAt <= inAt && !errors.outTime) errors.outTime = "OUT must be after IN.";
  if (Object.keys(errors).length) return { ok: false, errors };

  const supabase = createAdminClient();
  const inserted: string[] = [];
  const voided: string[] = [];

  async function undo() {
    if (inserted.length) await supabase.from("punches").delete().in("id", inserted);
    if (voided.length) await supabase.from("punches").update({ voided_at: null, void_reason: null }).in("id", voided);
  }

  try {
    const changes: { type: PunchType; at: Date; replaces: StoredPunch | null }[] = [];
    if (inChanged && inAt) changes.push({ type: "in", at: inAt, replaces: original.in });
    if (outChanged && outAt) changes.push({ type: "out", at: outAt, replaces: original.out });

    // Add the new rows first, so a failure never leaves a shift with a punch missing.
    for (const c of changes) {
      const { data, error } = await supabase
        .from("punches")
        .insert({
          staff_id: staffId,
          type: c.type,
          punched_at: c.at.toISOString(),
          source: "manual",
          note,
          photo_path: c.replaces?.photo_path ?? null,
        })
        .select("id")
        .single();
      if (error) throw new Error(`Insert failed: ${error.message}`);
      inserted.push(data.id);
    }
    for (const c of changes) {
      if (!c.replaces) continue;
      const { error } = await supabase
        .from("punches")
        .update({ voided_at: new Date().toISOString(), void_reason: `Edited: ${note}`.slice(0, 300) })
        .eq("id", c.replaces.id)
        .is("voided_at", null);
      if (error) throw new Error(`Void failed: ${error.message}`);
      voided.push(c.replaces.id);
    }

    // Keep the note on the punches that stay, so the row shows one note.
    if (note !== currentNote) {
      const kept = [original.in && !inChanged ? original.in.id : null, original.out && !outChanged ? original.out.id : null].filter(
        (id): id is string => id !== null,
      );
      if (kept.length) {
        const { error } = await supabase.from("punches").update({ note: note || null }).in("id", kept);
        if (error) throw new Error(`Note update failed: ${error.message}`);
      }
    }
  } catch (err) {
    console.error(err);
    await undo();
    return SAVE_FAILED;
  }

  revalidatePath("/admin/monitoring");
  revalidatePath("/admin/dashboard");
  return { ok: true, savedAt: Date.now() };
}

/**
 * Adds a shift nobody punched at the kiosk: a manual IN and, when given, a
 * manual OUT. Like the kiosk, a staff member gets one IN per shop date.
 */
export async function addShift(_prev: AddShiftState, formData: FormData): Promise<AddShiftState> {
  if (!(await isAdmin())) return NOT_ALLOWED;

  const staffId = str(formData, "staffId");
  const dateKey = str(formData, "dateKey");
  const inTime = str(formData, "inTime");
  const outTime = str(formData, "outTime");
  const note = str(formData, "note");

  const errors: Partial<Record<AddShiftField, string>> = {};
  if (!UUID.test(staffId)) errors.staffId = "Choose a staff member.";
  if (!DATE_KEY.test(dateKey)) errors.dateKey = "Choose a date.";
  else if (dateKey > shopNow().dateKey) errors.dateKey = "That date hasn't happened yet.";
  if (!inTime) errors.inTime = "Enter an IN time.";
  else if (!TIME_24H.test(inTime)) errors.inTime = "Use 24-hour time, e.g. 08:00.";
  if (outTime && !TIME_24H.test(outTime)) errors.outTime = "Use 24-hour time, e.g. 16:00.";
  if (!note) errors.note = "Add a note saying why this entry was added.";
  else if (note.length > 300) errors.note = "Keep notes under 300 characters.";
  if (Object.keys(errors).length) return { ok: false, errors };

  // The shift date belongs to the IN, so an OUT at or before the IN time is the next day.
  const inAt = shopInstant(dateKey, inTime);
  const outAt = outTime ? shopInstant(outTime <= inTime ? addDays(dateKey, 1) : dateKey, outTime) : null;
  const limit = Date.now() + FUTURE_SLACK_MS;
  if (inAt.getTime() > limit) errors.inTime = "That time hasn't happened yet.";
  if (outAt && outAt.getTime() > limit) errors.outTime = "That time hasn't happened yet.";
  if (Object.keys(errors).length) return { ok: false, errors };

  const supabase = createAdminClient();
  let inId: string | null = null;
  try {
    const { data: staff, error: staffError } = await supabase
      .from("staff")
      .select("id, role, active")
      .eq("id", staffId)
      .maybeSingle();
    if (staffError) throw new Error(`Loading staff failed: ${staffError.message}`);
    if (!staff || !staff.active || staff.role === NON_PUNCHING_ROLE) {
      return { ok: false, errors: { staffId: "Choose a staff member." } };
    }

    const { count, error: countError } = await supabase
      .from("punches")
      .select("id", { count: "exact", head: true })
      .eq("staff_id", staffId)
      .eq("type", "in")
      .is("voided_at", null)
      .gte("punched_at", shopInstant(dateKey, "00:00").toISOString())
      .lt("punched_at", shopInstant(addDays(dateKey, 1), "00:00").toISOString());
    if (countError) throw new Error(`Checking shifts failed: ${countError.message}`);
    if (count) {
      return { ok: false, errors: { dateKey: "Already has a shift on this date. Use Edit on that row instead." } };
    }

    const { data, error } = await supabase
      .from("punches")
      .insert({ staff_id: staffId, type: "in", punched_at: inAt.toISOString(), source: "manual", note })
      .select("id")
      .single();
    if (error) throw new Error(`Insert IN failed: ${error.message}`);
    inId = data.id;

    if (outAt) {
      const { error: outError } = await supabase
        .from("punches")
        .insert({ staff_id: staffId, type: "out", punched_at: outAt.toISOString(), source: "manual", note });
      if (outError) throw new Error(`Insert OUT failed: ${outError.message}`);
    }
  } catch (err) {
    console.error(err);
    // Never leave half an entry behind.
    if (inId) await supabase.from("punches").delete().eq("id", inId);
    return SAVE_FAILED;
  }

  revalidatePath("/admin/monitoring");
  revalidatePath("/admin/dashboard");
  return { ok: true, savedAt: Date.now(), added: { staffId, dateKey } };
}
