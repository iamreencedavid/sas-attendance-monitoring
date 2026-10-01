"use server";

import bcrypt from "bcryptjs";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/server";
import { SHOP_TIMEZONE, shopDateKey, shopDayStart } from "@/lib/time";
import { isDoubleTap, nextAllowedType, PIN_LOCK_MS, PIN_MAX_ATTEMPTS, PIN_PATTERN } from "./rules";
import type { LastPunch, PunchResult, PunchState, PunchType } from "./types";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const PHOTO_BUCKET = "punch-photos";
const MAX_PHOTO_BYTES = 500 * 1024;

const STATE_ERRORS = {
  double_tap: "You just punched. Wait a minute and try again.",
  already_in: "You're already clocked in.",
  not_in: "You're not clocked in.",
  in_today: "You've already punched in today. You can punch in again tomorrow.",
} as const;

export type VerifyPinResult = { ok: true } | { ok: false; error: string };

/**
 * Checks a staff member's PIN against pin_hash, with lockout after
 * PIN_MAX_ATTEMPTS wrong tries (PRD §8.3 steps 2–3). This is a public
 * endpoint, so it never reveals more than the error text below.
 */
export async function verifyStaffPin(staffId: string, pin: string): Promise<VerifyPinResult> {
  if (!UUID.test(staffId)) return { ok: false, error: "Unknown staff member." };
  if (!PIN_PATTERN.test(pin)) return { ok: false, error: "PIN must be 4–6 digits." };

  const supabase = createAdminClient();
  const { data: staff, error } = await supabase
    .from("staff")
    .select("active, pin_hash, failed_pin_count, locked_until")
    .eq("id", staffId)
    .maybeSingle();
  if (error) return { ok: false, error: "Couldn't check your PIN. Try again." };
  if (!staff?.active) return { ok: false, error: "Unknown staff member." };

  const now = Date.now();
  const lockedUntil = staff.locked_until ? new Date(staff.locked_until).getTime() : 0;
  if (lockedUntil > now) {
    const minutes = Math.ceil((lockedUntil - now) / 60_000);
    return { ok: false, error: `Too many attempts. Try again in ${minutes} min.` };
  }

  if (await bcrypt.compare(pin, staff.pin_hash)) {
    if (staff.failed_pin_count > 0 || staff.locked_until) {
      await supabase
        .from("staff")
        .update({ failed_pin_count: 0, locked_until: null })
        .eq("id", staffId);
    }
    return { ok: true };
  }

  const failures = staff.failed_pin_count + 1;
  if (failures >= PIN_MAX_ATTEMPTS) {
    await supabase
      .from("staff")
      .update({ failed_pin_count: 0, locked_until: new Date(now + PIN_LOCK_MS).toISOString() })
      .eq("id", staffId);
    return {
      ok: false,
      error: `Too many attempts. Try again in ${PIN_LOCK_MS / 60_000} min.`,
    };
  }

  await supabase.from("staff").update({ failed_pin_count: failures }).eq("id", staffId);
  const left = PIN_MAX_ATTEMPTS - failures;
  return { ok: false, error: `Wrong PIN. ${left} ${left === 1 ? "try" : "tries"} left.` };
}

/** Last counted (non-voided) punch, or null. Only the server reads this. */
async function lastPunch(staffId: string): Promise<LastPunch | null> {
  const { data, error } = await createAdminClient()
    .from("punches")
    .select("type, punched_at")
    .eq("staff_id", staffId)
    .is("voided_at", null)
    .order("punched_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`Loading last punch failed: ${error.message}`);
  return data ? { type: data.type, punchedAt: new Date(data.punched_at) } : null;
}

/** Time of today's counted IN (shop date), or null. One IN per day. */
async function inToday(staffId: string): Promise<Date | null> {
  const { data, error } = await createAdminClient()
    .from("punches")
    .select("punched_at")
    .eq("staff_id", staffId)
    .eq("type", "in")
    .is("voided_at", null)
    .gte("punched_at", shopDayStart(shopDateKey()).toISOString())
    .order("punched_at")
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`Loading today's IN failed: ${error.message}`);
  return data ? new Date(data.punched_at) : null;
}

/**
 * The kiosk's status line when a name is picked: only punch types and times,
 * never the photo or anything else about the person.
 */
export async function getPunchState(staffId: string): Promise<PunchState> {
  if (!UUID.test(staffId)) return { last: null, inToday: null };
  const [last, todayIn] = await Promise.all([lastPunch(staffId), inToday(staffId)]);
  return { last, inToday: todayIn };
}

async function isJpeg(photo: Blob): Promise<boolean> {
  const head = new Uint8Array(await photo.slice(0, 3).arrayBuffer());
  return head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff;
}

/**
 * Records a kiosk punch (PRD §8.3). Public endpoint: everything is checked
 * here, the photo is stored first, and `record_punch` re-checks the state
 * and inserts under a per-staff lock. A failed insert removes the photo.
 */
export async function punch(formData: FormData): Promise<PunchResult> {
  const staffId = String(formData.get("staffId") ?? "");
  const pin = String(formData.get("pin") ?? "");
  const type = formData.get("type");
  const photo = formData.get("photo");

  if (type !== "in" && type !== "out") return { ok: false, error: "Choose IN or OUT." };
  if (
    !(photo instanceof Blob) ||
    photo.type !== "image/jpeg" ||
    photo.size === 0 ||
    photo.size > MAX_PHOTO_BYTES ||
    !(await isJpeg(photo))
  ) {
    return { ok: false, error: "Photo couldn't be captured. Try again." };
  }

  const pinCheck = await verifyStaffPin(staffId, pin);
  if (!pinCheck.ok) return pinCheck;

  const supabase = createAdminClient();
  try {
    // Cheap pre-check so a rejected punch never uploads a photo.
    const now = new Date();
    const [last, todayIn] = await Promise.all([lastPunch(staffId), inToday(staffId)]);
    if (isDoubleTap(last, now)) return { ok: false, error: STATE_ERRORS.double_tap };
    if (type === "in" && todayIn) return { ok: false, error: STATE_ERRORS.in_today };
    if (nextAllowedType(last, now, !!todayIn) !== type) {
      return { ok: false, error: type === "in" ? STATE_ERRORS.already_in : STATE_ERRORS.not_in };
    }

    const punchId = crypto.randomUUID();
    const photoPath = `${staffId}/${shopDateKey(now)}/${punchId}.jpg`;
    const upload = await supabase.storage
      .from(PHOTO_BUCKET)
      .upload(photoPath, photo, { contentType: "image/jpeg" });
    if (upload.error) throw new Error(`Photo upload failed: ${upload.error.message}`);

    const { data: punchedAt, error } = await supabase.rpc("record_punch", {
      p_id: punchId,
      p_staff_id: staffId,
      p_type: type satisfies PunchType,
      p_photo_path: photoPath,
      p_user_agent: (await headers()).get("user-agent") ?? "",
      p_timezone: SHOP_TIMEZONE,
    });
    if (error) {
      await supabase.storage.from(PHOTO_BUCKET).remove([photoPath]);
      const known = STATE_ERRORS[error.message as keyof typeof STATE_ERRORS];
      if (known) return { ok: false, error: known };
      throw new Error(`record_punch failed: ${error.message}`);
    }

    const { data: staff } = await supabase.from("staff").select("name").eq("id", staffId).single();
    return { ok: true, name: staff?.name ?? "", type, punchedAt: new Date(punchedAt as string) };
  } catch (err) {
    console.error(err);
    return { ok: false, error: "Couldn't save your punch. Try again." };
  }
}
