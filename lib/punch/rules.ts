import type { LastPunch, PunchType } from "./types";

/** An IN older than this is treated as a forgotten OUT (PRD §8.3). */
export const STALE_IN_MS = 16 * 60 * 60 * 1000;

/** Punches closer together than this are rejected as a double tap. */
export const DOUBLE_TAP_MS = 60 * 1000;

export const PIN_PATTERN = /^\d{4,6}$/;

/** Wrong PINs allowed before the staff member is locked out (PRD §8.3). */
export const PIN_MAX_ATTEMPTS = 5;
export const PIN_LOCK_MS = 5 * 60 * 1000;

export function isStaleIn(last: LastPunch | null, now: Date): boolean {
  return (
    last?.type === "in" &&
    now.getTime() - last.punchedAt.getTime() > STALE_IN_MS
  );
}

export function nextAllowedType(last: LastPunch | null, now: Date): PunchType {
  if (!last || last.type === "out" || isStaleIn(last, now)) return "in";
  return "out";
}

export function isDoubleTap(last: LastPunch | null, now: Date): boolean {
  return !!last && now.getTime() - last.punchedAt.getTime() < DOUBLE_TAP_MS;
}
