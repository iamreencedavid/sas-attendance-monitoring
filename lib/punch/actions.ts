"use server";

import bcrypt from "bcryptjs";
import { createAdminClient } from "@/lib/supabase/server";
import { PIN_LOCK_MS, PIN_MAX_ATTEMPTS, PIN_PATTERN } from "./rules";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
