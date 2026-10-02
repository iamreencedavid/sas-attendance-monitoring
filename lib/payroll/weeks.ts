import type { ShiftRow } from "@/lib/monitoring/types";
import { addDays, formatDateKey } from "@/lib/time";

/** 0 = Monday … 6 = Sunday, for a "YYYY-MM-DD" shop date. */
function weekday(dateKey: string): number {
  return (new Date(`${dateKey}T00:00:00Z`).getUTCDay() + 6) % 7;
}

/** The Monday of the week `dateKey` is in. Sunday belongs to the week before it. */
export function weekStart(dateKey: string): string {
  return addDays(dateKey, -weekday(dateKey));
}

/**
 * The last pay week that has fully ended, Monday–Saturday (the shop is
 * closed on Sunday). Fri 2 Oct → Mon 21 – Sat 26 Sep; Sun 4 Oct → 28 Sep – 3 Oct.
 */
export function lastFullWeek(today: string): { from: string; to: string } {
  const saturday = addDays(today, -((weekday(today) + 2) % 7 || 7));
  return { from: addDays(saturday, -5), to: saturday };
}

export type PayWeek = {
  /** Monday, also the React key. */
  monday: string;
  /** "Mon 21 Sep – Sat 26 Sep", clipped to the searched From/To. */
  label: string;
  shifts: ShiftRow[];
};

/**
 * Shifts grouped into Mon–Sat pay weeks, newest week first, each week's
 * shifts kept in the order given. A Sunday shift (rare) stays in the week
 * before it so its pay is never dropped; the drawer shows its real date.
 */
export function groupByWeek(shifts: ShiftRow[], from: string, to: string): PayWeek[] {
  const weeks = new Map<string, ShiftRow[]>();
  for (const shift of shifts) {
    const monday = weekStart(shift.dateKey);
    weeks.set(monday, [...(weeks.get(monday) ?? []), shift]);
  }
  return [...weeks.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([monday, weekShifts]) => {
      const start = monday < from ? from : monday;
      const saturday = addDays(monday, 5);
      const end = saturday > to ? to : saturday;
      const label = start === end ? formatDateKey(start) : `${formatDateKey(start)} – ${formatDateKey(end)}`;
      return { monday, label, shifts: weekShifts };
    });
}
