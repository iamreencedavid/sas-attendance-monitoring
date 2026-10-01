// Browser-side stand-in for the `punch` Server Action (PRD §8.3) until
// Supabase lands. Same input/output shape, state kept in memory only.
import { isDoubleTap, nextAllowedType, PIN_PATTERN } from "./rules";
import type { LastPunch, PunchInput, PunchResult, Staff } from "./types";

export const MOCK_STAFF: Staff[] = [
  { id: "s1", name: "Maria" },
  { id: "s2", name: "Jomar" },
  { id: "s3", name: "Ana" },
  { id: "s4", name: "Kevin" },
  { id: "s5", name: "Lia" },
];

const MAX_PHOTO_BYTES = 500 * 1024;

const lastPunches = new Map<string, LastPunch>();

export function getLastPunch(staffId: string): LastPunch | null {
  return lastPunches.get(staffId) ?? null;
}

export async function mockPunch(input: PunchInput): Promise<PunchResult> {
  await new Promise((resolve) => setTimeout(resolve, 600));

  const staff = MOCK_STAFF.find((s) => s.id === input.staffId);
  if (!staff) return { ok: false, error: "Unknown staff member." };
  if (!PIN_PATTERN.test(input.pin)) {
    return { ok: false, error: "PIN must be 4–6 digits." };
  }
  if (input.photo.type !== "image/jpeg" || input.photo.size > MAX_PHOTO_BYTES) {
    return { ok: false, error: "Photo couldn't be captured. Try again." };
  }

  const now = new Date();
  const last = getLastPunch(staff.id);
  if (isDoubleTap(last, now)) {
    return { ok: false, error: "You just punched. Wait a minute and try again." };
  }
  if (nextAllowedType(last, now) !== input.type) {
    return {
      ok: false,
      error: input.type === "out" ? "You're not clocked in." : "You're already clocked in.",
    };
  }

  lastPunches.set(staff.id, { type: input.type, punchedAt: now });
  return { ok: true, name: staff.name, type: input.type, punchedAt: now };
}
