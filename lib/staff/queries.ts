import "server-only";
import { createAdminClient } from "@/lib/supabase/server";
import { NON_PUNCHING_ROLE, type Staff } from "@/lib/punch/types";
import type { StaffRecord } from "./types";

/** Active staff for the punch page, supervisors excluded. Only id, name and role leave the server. */
export async function getActiveStaff(): Promise<Staff[]> {
  const { data, error } = await createAdminClient()
    .from("staff")
    .select("id, name, role")
    .eq("active", true)
    .neq("role", NON_PUNCHING_ROLE)
    .order("name");
  if (error) throw new Error(`Loading staff failed: ${error.message}`);
  return data;
}

type StaffRow = {
  id: string;
  name: string;
  role: StaffRecord["role"];
  shift_start: string;
  shift_end: string;
  saturday_start: string | null;
  saturday_end: string | null;
  saturday_off: boolean;
  daily_rate: number | string | null;
  overtime_rate: number | string | null;
  active: boolean;
  failed_pin_count: number;
  locked_until: string | null;
  created_at: string;
};

/** Every staff member for /admin, active first. Never selects pin_hash. */
export async function getAllStaff(): Promise<StaffRecord[]> {
  const { data, error } = await createAdminClient()
    .from("staff")
    .select("id, name, role, shift_start, shift_end, saturday_start, saturday_end, saturday_off, daily_rate, overtime_rate, active, failed_pin_count, locked_until, created_at")
    .order("active", { ascending: false })
    .order("name");
  if (error) throw new Error(`Loading staff failed: ${error.message}`);

  // Lock time is resolved here so the browser never compares clocks.
  const now = Date.now();
  return (data as StaffRow[]).map((row) => {
    const lockMs = row.locked_until ? new Date(row.locked_until).getTime() - now : 0;
    return {
      id: row.id,
      name: row.name,
      role: row.role,
      shiftStart: row.shift_start.slice(0, 5),
      shiftEnd: row.shift_end.slice(0, 5),
      saturday: row.saturday_off
        ? { kind: "off" }
        : row.saturday_start && row.saturday_end
          ? { kind: "shift", start: row.saturday_start.slice(0, 5), end: row.saturday_end.slice(0, 5) }
          : { kind: "same" },
      dailyRate: row.daily_rate === null ? null : Number(row.daily_rate),
      overtimeRate: row.overtime_rate === null ? null : Number(row.overtime_rate),
      active: row.active,
      failedPinCount: row.failed_pin_count,
      lockMinutesLeft: lockMs > 0 ? Math.ceil(lockMs / 60_000) : null,
      createdAt: row.created_at,
    };
  });
}
