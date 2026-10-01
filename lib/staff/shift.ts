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
