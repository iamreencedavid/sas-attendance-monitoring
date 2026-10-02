import "server-only";
import { getSettings } from "@/lib/settings/queries";
import { createAdminClient } from "@/lib/supabase/server";
import { getAllStaff } from "@/lib/staff/queries";
import { toMinutes } from "@/lib/staff/shift";
import { addDays, formatClock, shopDayStart, shopNow } from "@/lib/time";
import { NON_PUNCHING_ROLE, type PunchType } from "@/lib/punch/types";
import { deriveToday, pickShift, shiftWindow } from "./status";
import type { TodayBoard, TodayPunch } from "./types";

const PHOTO_BUCKET = "punch-photos";
const PHOTO_URL_SECONDS = 60 * 60;
/** Punches this long before the shift start still count as that shift's (early arrival). */
const EARLY_MINUTES = 3 * 60;

type PunchRow = {
  staff_id: string;
  type: PunchType;
  punched_at: string;
  shift_start: string;
  source: "kiosk" | "manual";
  photo_path: string | null;
};

/**
 * Today's status for every active staff member, sorted by shift start.
 * Voided punches are ignored. Everything time-related is computed here so
 * the browser never compares clocks.
 */
export async function getTodayBoard(): Promise<TodayBoard> {
  const [allStaff, settings] = await Promise.all([getAllStaff(), getSettings()]);
  // Supervisors don't punch, so they have no status card.
  const staff = allStaff.filter((s) => s.active && s.role !== NON_PUNCHING_ROLE);
  const now = shopNow();
  const yesterday = addDays(now.dateKey, -1);

  // From yesterday's midnight: an overnight shift starts the day before.
  const supabase = createAdminClient();
  const { data, error } = staff.length
    ? await supabase
        .from("punches")
        .select("staff_id, type, punched_at, shift_start, source, photo_path")
        .in("staff_id", staff.map((s) => s.id))
        .is("voided_at", null)
        .gte("punched_at", shopDayStart(yesterday).toISOString())
        .order("punched_at")
    : { data: [], error: null };
  if (error) throw new Error(`Loading punches failed: ${error.message}`);
  const rows = data as PunchRow[];

  const paths = rows.flatMap((r) => (r.photo_path ? [r.photo_path] : []));
  const urls = new Map<string, string>();
  if (paths.length) {
    const signed = await supabase.storage.from(PHOTO_BUCKET).createSignedUrls(paths, PHOTO_URL_SECONDS);
    for (const s of signed.data ?? []) if (s.path && s.signedUrl) urls.set(s.path, s.signedUrl);
  }

  return {
    dateLabel: now.dateLabel,
    time: now.time,
    staff: staff
      .map((s) => {
        const { shift, fromYesterday, dayOff } = pickShift(s, now.dateKey, yesterday, now.minutes);
        const staffToday = { ...s, shiftStart: shift.start, shiftEnd: shift.end };
        // Minutes on the axis of the day this shift started (see shiftWindow).
        const window = shiftWindow(staffToday, now.minutes, fromYesterday);
        const dayStart = shopDayStart(fromYesterday ? yesterday : now.dateKey).getTime();
        const mine: TodayPunch[] = rows
          .filter((r) => r.staff_id === s.id)
          .map((r) => {
            const minutes = Math.floor((new Date(r.punched_at).getTime() - dayStart) / 60_000);
            return {
              type: r.type,
              minutes,
              time: formatClock(minutes),
              shiftStart: r.shift_start.slice(0, 5),
              source: r.source,
              photoUrl: r.photo_path ? (urls.get(r.photo_path) ?? null) : null,
            };
          });
        const today = mine.filter((p) => p.minutes >= window.start - EARLY_MINUTES);
        // An IN left open from an earlier day still shows (as Missing OUT once it's 16h old).
        const carried = today.length === 0 && mine.at(-1)?.type === "in" ? [mine.at(-1)!] : today;
        return deriveToday(staffToday, carried, {
          nowMinutes: now.minutes,
          fromYesterday,
          dayOff,
          graceMinutes: settings.graceMinutes,
        });
      })
      .sort((a, b) => toMinutes(a.shiftStart) - toMinutes(b.shiftStart) || a.name.localeCompare(b.name)),
  };
}
