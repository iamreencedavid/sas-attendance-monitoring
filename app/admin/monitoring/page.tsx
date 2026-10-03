import { connection } from "next/server";
import { AddShiftButton } from "@/components/admin/monitoring/AddShiftButton";
import { MonitoringFilters } from "@/components/admin/monitoring/MonitoringFilters";
import { ShiftTable } from "@/components/admin/monitoring/ShiftTable";
import { requireAdmin } from "@/lib/auth/admin";
import { getShifts } from "@/lib/monitoring/queries";
import { getSettings } from "@/lib/settings/queries";
import type { AddShiftStaff, ShiftRow } from "@/lib/monitoring/types";
import { NON_PUNCHING_ROLE } from "@/lib/punch/types";
import { getAllStaff } from "@/lib/staff/queries";
import type { StaffRecord } from "@/lib/staff/types";
import { shopNow } from "@/lib/time";

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function param(value: string | string[] | undefined): string {
  return typeof value === "string" ? value : "";
}

export default async function MonitoringPage({ searchParams }: PageProps<"/admin/monitoring">) {
  // Layouts don't re-run on client navigation, so the page checks too.
  await requireAdmin();
  await connection();

  const params = await searchParams;
  const today = shopNow().dateKey;
  let from = DATE_KEY.test(param(params.from)) ? param(params.from) : today;
  let to = DATE_KEY.test(param(params.to)) ? param(params.to) : today;
  if (from > to) [from, to] = [to, from];
  const staffId = UUID.test(param(params.staff)) ? param(params.staff) : "";

  let staff: StaffRecord[];
  let shifts: ShiftRow[];
  try {
    [staff, shifts] = await Promise.all([
      getAllStaff(),
      getSettings().then((settings) => getShifts({ staffId, from, to }, settings)),
    ]);
  } catch (err) {
    console.error(err);
    return (
      <div role="alert" className="rounded-xl border border-admin-line bg-white p-6">
        <h1 className="text-2xl font-extrabold tracking-tight">Monitoring</h1>
        <p className="mt-2 text-sm text-stamp">
          Couldn&apos;t load punches from Supabase. Check the connection and reload the page.
        </p>
      </div>
    );
  }

  // Staff who can have a time entry added: the same people the kiosk lists.
  const addable: AddShiftStaff[] = staff
    .filter((s) => s.active && s.role !== NON_PUNCHING_ROLE)
    .map(({ id, name, shiftStart, shiftEnd, saturday }) => ({ id, name, shiftStart, shiftEnd, saturday }));

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold tracking-tight">Monitoring</h1>
        <AddShiftButton staff={addable} filters={{ staffId, from, to }} today={today} />
      </div>
      <MonitoringFilters staff={staff} filters={{ staffId, from, to }} today={today} />
      <ShiftTable shifts={shifts} />
    </div>
  );
}
