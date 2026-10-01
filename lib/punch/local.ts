// Punch flow while there is no punches table yet: the PIN is checked on the
// server (verifyStaffPin), but IN/OUT history lives in browser memory and is
// lost on reload. Replace with the real `punch` Server Action (PRD §8.3).
import { verifyStaffPin } from "./actions";
import { isDoubleTap, nextAllowedType } from "./rules";
import type { LastPunch, PunchInput, PunchResult } from "./types";

const MAX_PHOTO_BYTES = 500 * 1024;

const lastPunches = new Map<string, LastPunch>();

export function getLastPunch(staffId: string): LastPunch | null {
  return lastPunches.get(staffId) ?? null;
}

export async function submitPunch(input: PunchInput, staffName: string): Promise<PunchResult> {
  if (input.photo.type !== "image/jpeg" || input.photo.size > MAX_PHOTO_BYTES) {
    return { ok: false, error: "Photo couldn't be captured. Try again." };
  }

  const pinCheck = await verifyStaffPin(input.staffId, input.pin);
  if (!pinCheck.ok) return pinCheck;

  const now = new Date();
  const last = getLastPunch(input.staffId);
  if (isDoubleTap(last, now)) {
    return { ok: false, error: "You just punched. Wait a minute and try again." };
  }
  if (nextAllowedType(last, now) !== input.type) {
    return {
      ok: false,
      error: input.type === "out" ? "You're not clocked in." : "You're already clocked in.",
    };
  }

  lastPunches.set(input.staffId, { type: input.type, punchedAt: now });
  return { ok: true, name: staffName, type: input.type, punchedAt: now };
}
