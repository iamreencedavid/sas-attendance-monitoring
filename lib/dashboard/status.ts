import { STALE_IN_MS } from "@/lib/punch/rules";
import { isOvernight, shiftMinutes, toMinutes } from "@/lib/staff/shift";
import { formatClock } from "@/lib/time";
import type { StaffToday, TodayPunch } from "./types";

type ShiftStaff = Pick<StaffToday, "id" | "name" | "role" | "shiftStart" | "shiftEnd">;

const STALE_IN_MINUTES = STALE_IN_MS / 60_000;

/**
 * The shift window on one minute axis. A shift belongs to the day it starts,
 * so in the small hours of an overnight shift "now" sits past 1440 on
 * yesterday's axis.
 */
export function shiftWindow(staff: ShiftStaff, nowMinutes: number) {
  const start = toMinutes(staff.shiftStart);
  const end = start + shiftMinutes(staff.shiftStart, staff.shiftEnd);
  const inYesterdaysShift = isOvernight(staff.shiftStart, staff.shiftEnd) && nowMinutes < toMinutes(staff.shiftEnd);
  return { start, end, now: inYesterdaysShift ? nowMinutes + 1440 : nowMinutes };
}

/**
 * Status for one staff member from today's punches (oldest first). An IN up
 * to `graceMinutes` after the shift start is on time (8:15 with 15 minutes of
 * grace), and only the minutes past the grace count as late.
 */
export function deriveToday(
  staff: ShiftStaff,
  punches: TodayPunch[],
  nowMinutes: number,
  graceMinutes: number,
): StaffToday {
  const { start, end, now } = shiftWindow(staff, nowMinutes);
  const lateFrom = start + graceMinutes;
  const firstIn = punches.find((p) => p.type === "in");
  const last = punches.at(-1);

  let worked = 0;
  let openIn: number | null = null;
  for (const p of punches) {
    if (p.type === "in") openIn = p.minutes;
    else if (openIn !== null) {
      worked += p.minutes - openIn;
      openIn = null;
    }
  }
  if (openIn !== null) worked += Math.max(0, now - openIn);

  const base = {
    id: staff.id,
    name: staff.name,
    role: staff.role,
    shiftStart: staff.shiftStart,
    shiftEnd: staff.shiftEnd,
    punches,
    // Against the shift copied onto the punch, so a later shift change doesn't rewrite history.
    // The grace is the current setting: it isn't copied onto punches.
    lateMinutes: firstIn ? Math.max(0, firstIn.minutes - (toMinutes(firstIn.shiftStart) + graceMinutes)) : 0,
    overdueMinutes: 0,
    shiftOver: false,
    graceUntil: null,
    workedMinutes: worked,
  };

  if (last?.type === "in") {
    return { ...base, status: now - last.minutes > STALE_IN_MINUTES ? "missing_out" : "on_shift" };
  }
  if (last?.type === "out") return { ...base, status: "done" };
  if (now > lateFrom) return { ...base, status: "late", overdueMinutes: now - lateFrom, shiftOver: now >= end };
  const inGrace = graceMinutes > 0 && now >= start;
  return { ...base, status: "not_in", graceUntil: inGrace ? formatClock(lateFrom) : null };
}
