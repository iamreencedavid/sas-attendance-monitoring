import "server-only";
import { createAdminClient } from "@/lib/supabase/server";
import { getAllStaff } from "@/lib/staff/queries";
import { addDays, shopDayStart, shopNow } from "@/lib/time";
import type { PunchType } from "@/lib/punch/types";
import { pairShifts } from "./shifts";
import type { MonitoringFilters, PunchSource, PunchWhere, ShiftPunch, ShiftRow } from "./types";

const PHOTO_BUCKET = "punch-photos";
const PHOTO_URL_SECONDS = 60 * 60;

type PunchRow = {
  id: string;
  staff_id: string;
  type: PunchType;
  punched_at: string;
  shift_start: string;
  shift_end: string;
  source: PunchSource;
  note: string | null;
  photo_path: string | null;
  voided_at: string | null;
  void_reason: string | null;
  ip_address: string | null;
  geo_city: string | null;
  geo_region: string | null;
  geo_country: string | null;
  geo_latitude: number | string | null;
  geo_longitude: number | string | null;
  device: { name: string } | null;
};

function whereOf(r: PunchRow): PunchWhere | null {
  const label = [r.geo_city, r.geo_region, r.geo_country].filter(Boolean).join(", ") || null;
  if (!r.ip_address && !label) return null;
  const hasPoint = r.geo_latitude !== null && r.geo_longitude !== null;
  return {
    ip: r.ip_address,
    label,
    mapUrl: hasPoint ? `https://www.google.com/maps?q=${Number(r.geo_latitude)},${Number(r.geo_longitude)}` : null,
  };
}

/**
 * Shifts whose date (the IN's shop date) is within from–to, newest first.
 * Reads a day either side so overnight pairs are complete.
 */
export async function getShifts(
  { staffId, from, to }: MonitoringFilters,
  { graceMinutes }: { graceMinutes: number },
): Promise<ShiftRow[]> {
  const staff = await getAllStaff();
  const supabase = createAdminClient();

  let query = supabase
    .from("punches")
    .select(
      "id, staff_id, type, punched_at, shift_start, shift_end, source, note, photo_path, voided_at, void_reason, ip_address, geo_city, geo_region, geo_country, geo_latitude, geo_longitude, device:kiosk_devices(name)",
    )
    .gte("punched_at", shopDayStart(addDays(from, -1)).toISOString())
    .lt("punched_at", shopDayStart(addDays(to, 2)).toISOString())
    .order("punched_at");
  if (staffId) query = query.eq("staff_id", staffId);
  const { data, error } = await query;
  if (error) throw new Error(`Loading punches failed: ${error.message}`);
  const rows = data as unknown as PunchRow[];

  const paths = [...new Set(rows.flatMap((r) => (r.photo_path ? [r.photo_path] : [])))];
  const urls = new Map<string, string>();
  if (paths.length) {
    const signed = await supabase.storage.from(PHOTO_BUCKET).createSignedUrls(paths, PHOTO_URL_SECONDS);
    for (const s of signed.data ?? []) if (s.path && s.signedUrl) urls.set(s.path, s.signedUrl);
  }

  const punches: ShiftPunch[] = rows.map((r) => {
    const local = shopNow(new Date(r.punched_at));
    return {
      id: r.id,
      staffId: r.staff_id,
      type: r.type,
      at: r.punched_at,
      dateKey: local.dateKey,
      time: local.time,
      shiftStart: r.shift_start.slice(0, 5),
      shiftEnd: r.shift_end.slice(0, 5),
      source: r.source,
      note: r.note,
      photoPath: r.photo_path,
      photoUrl: r.photo_path ? (urls.get(r.photo_path) ?? null) : null,
      voidedAt: r.voided_at,
      voidReason: r.void_reason,
      where: whereOf(r),
      deviceName: r.device?.name ?? null,
    };
  });

  const info = new Map(staff.map((s) => [s.id, { name: s.name, role: s.role }]));
  return pairShifts(punches, info, new Date(), graceMinutes).filter((r) => r.dateKey >= from && r.dateKey <= to);
}
