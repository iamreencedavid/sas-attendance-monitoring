import { connection } from "next/server";
import { PayrollFilters } from "@/components/admin/payroll/PayrollFilters";
import { PayrollTable, type PayrollWeekView } from "@/components/admin/payroll/PayrollTable";
import { requireAdmin } from "@/lib/auth/admin";
import { getShifts } from "@/lib/monitoring/queries";
import { getSettings } from "@/lib/settings/queries";
import { calculatePayroll, type Payroll } from "@/lib/payroll/payroll";
import { groupByWeek, lastFullWeek } from "@/lib/payroll/weeks";
import { getAllStaff } from "@/lib/staff/queries";
import type { StaffRecord } from "@/lib/staff/types";
import { shopNow } from "@/lib/time";

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function param(value: string | string[] | undefined): string {
  return typeof value === "string" ? value : "";
}

export default async function PayrollPage({ searchParams }: PageProps<"/admin/payroll">) {
  // Layouts don't re-run on client navigation, so the page checks too.
  await requireAdmin();
  await connection();

  const params = await searchParams;
  const today = shopNow().dateKey;
  const week = lastFullWeek(today);
  let from = DATE_KEY.test(param(params.from)) ? param(params.from) : week.from;
  let to = DATE_KEY.test(param(params.to)) ? param(params.to) : week.to;
  if (from > to) [from, to] = [to, from];
  const staffId = UUID.test(param(params.staff)) ? param(params.staff) : "";

  let staff: StaffRecord[];
  let picked: { staff: StaffRecord; weeks: PayrollWeekView[]; total: Payroll; graceMinutes: number } | null = null;
  try {
    staff = await getAllStaff();
    const person = staff.find((s) => s.id === staffId);
    // Nothing is loaded until one staff member is picked and searched.
    if (person) {
      const settings = await getSettings();
      const shifts = await getShifts({ staffId: person.id, from, to }, settings);
      picked = {
        staff: person,
        weeks: groupByWeek(shifts, from, to).map((w) => ({ ...w, payroll: calculatePayroll(w.shifts, person) })),
        total: calculatePayroll(shifts, person),
        graceMinutes: settings.graceMinutes,
      };
    }
  } catch (err) {
    console.error(err);
    return (
      <div role="alert" className="rounded-xl border border-admin-line bg-white p-6">
        <h1 className="text-2xl font-extrabold tracking-tight">Payroll</h1>
        <p className="mt-2 text-sm text-stamp">
          Couldn&apos;t load punches from Supabase. Check the connection and reload the page.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-4">
        <h1 className="text-2xl font-extrabold tracking-tight">Payroll</h1>
        <p className="mt-0.5 text-[13px] text-admin-subtle">Weekly pay, Monday to Saturday, from completed shifts.</p>
      </div>
      <PayrollFilters staff={staff} filters={{ staffId: picked ? staffId : "", from, to }} today={today} />
      <PayrollTable picked={picked} />
    </div>
  );
}
