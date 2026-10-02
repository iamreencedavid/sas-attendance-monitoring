/** Shift dropdown choices: every hour, 24-hour format ("00:00" … "23:00"). */
export const SHIFT_TIMES = Array.from({ length: 24 }, (_, h) => `${String(h).padStart(2, "0")}:00`);

/** "HH:MM" (24h) → minutes since midnight. */
export function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

/** Length of a shift in minutes; an end before the start wraps past midnight. */
export function shiftMinutes(start: string, end: string): number {
  const diff = toMinutes(end) - toMinutes(start);
  return diff > 0 ? diff : diff + 24 * 60;
}

export function isOvernight(start: string, end: string): boolean {
  return toMinutes(end) < toMinutes(start);
}

/** Hours as a short number for the table column, e.g. "8" or "7.5". */
export function shiftHours(start: string, end: string): string {
  const hours = shiftMinutes(start, end) / 60;
  return Number.isInteger(hours) ? String(hours) : hours.toFixed(1);
}

/** "8 hours", "7.5 hours", "Overnight, 8 hours". */
export function describeShift(start: string, end: string): string {
  const hours = shiftHours(start, end);
  const label = `${hours} ${hours === "1" ? "hour" : "hours"}`;
  return isOvernight(start, end) ? `Overnight, ${label}` : label;
}

/** A staff member's Saturday: the weekday shift, its own hours, or not scheduled. */
export type SaturdayShift = { kind: "same" } | { kind: "shift"; start: string; end: string } | { kind: "off" };

export type Shift = { start: string; end: string };

/** "2026-10-03" (a shop date key) → true on Saturdays. */
export function isSaturday(dateKey: string): boolean {
  return new Date(`${dateKey}T00:00:00Z`).getUTCDay() === 6;
}

/**
 * The shift scheduled on a shop date, or "off". Saturdays use the Saturday
 * shift when one is set; every other day (Sunday too) uses the weekday shift.
 * The punches_copy_shift trigger applies the same rule to each punch.
 */
export function shiftOn(
  staff: { shiftStart: string; shiftEnd: string; saturday: SaturdayShift },
  dateKey: string,
): Shift | "off" {
  if (isSaturday(dateKey)) {
    if (staff.saturday.kind === "off") return "off";
    if (staff.saturday.kind === "shift") return { start: staff.saturday.start, end: staff.saturday.end };
  }
  return { start: staff.shiftStart, end: staff.shiftEnd };
}

/** "08:00–14:00", "Same as weekday", "Day off". */
export function describeSaturday(saturday: SaturdayShift): string {
  if (saturday.kind === "shift") return `${saturday.start}–${saturday.end}`;
  return saturday.kind === "off" ? "Day off" : "Same as weekday";
}
