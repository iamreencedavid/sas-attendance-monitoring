"use client";

import { useState, type ReactNode } from "react";
import { RoleChip } from "@/components/admin/staff/RoleChip";
import { Sheet } from "@/components/ui/sheet";
import type { Payroll } from "@/lib/payroll/payroll";
import type { PayWeek } from "@/lib/payroll/weeks";
import { formatPeso } from "@/lib/staff/pay";
import type { StaffRecord } from "@/lib/staff/types";
import { formatDuration } from "@/lib/time";
import { PayrollDrawer } from "./PayrollDrawer";

export type PayrollWeekView = PayWeek & { payroll: Payroll };

const peso = (centavos: number) => formatPeso(centavos / 100);
const duration = (minutes: number) => (minutes ? formatDuration(minutes) : "—");

function Empty({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-[10px] border border-admin-line bg-white px-4 py-10 text-center text-sm text-admin-subtle">{children}</p>
  );
}

function NotCounted({ payroll }: { payroll: Payroll }) {
  const n = payroll.skipped.length;
  return n ? <span className="block text-xs font-bold text-stamp">⚠ {n} not counted</span> : null;
}

export function PayrollTable({
  picked,
}: {
  picked: { staff: StaffRecord; weeks: PayrollWeekView[]; total: Payroll } | null;
}) {
  const [open, setOpen] = useState<string | null>(null);
  // What the drawer last showed, kept while it animates closed.
  const [shown, setShown] = useState<{ monday: string; n: number }>({ monday: "", n: 0 });

  if (!picked) return <Empty>Pick a staff member and press Search.</Empty>;

  const { staff, weeks, total } = picked;
  const noDaily = staff.dailyRate === null;
  const viewing = weeks.find((w) => w.monday === shown.monday);

  function openDrawer(monday: string) {
    setOpen(monday);
    setShown((prev) => ({ monday, n: prev.n + 1 }));
  }

  const totalCell = (p: Payroll) => (noDaily ? "—" : peso(p.total));

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[13px] text-admin-subtle tabular-nums">
        <span className="text-base font-extrabold text-admin-slate">{staff.name}</span>
        <RoleChip role={staff.role} />
        <span>
          Daily rate {formatPeso(staff.dailyRate)} · OT {formatPeso(staff.overtimeRate)}
          {staff.overtimeRate === null ? "" : "/hr"}
        </span>
      </div>

      {weeks.length === 0 ? (
        <Empty>No shifts in this range.</Empty>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-[10px] border border-admin-line bg-white md:block">
            <table className="w-full border-collapse text-[13.5px] tabular-nums">
              <thead>
                <tr className="bg-[#fbfbfc] text-left text-xs font-bold text-admin-subtle">
                  <th className="px-3.5 py-2.5 font-bold">Week</th>
                  <th className="px-3.5 py-2.5 font-bold">Days paid</th>
                  <th className="px-3.5 py-2.5 font-bold">Late/early</th>
                  <th className="px-3.5 py-2.5 font-bold">OT</th>
                  <th className="px-3.5 py-2.5 text-right font-bold">Total</th>
                  <th className="px-3.5 py-2.5"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {weeks.map((w) => (
                  <tr key={w.monday} className={`border-t border-[#eef0f2] align-middle ${open === w.monday ? "bg-admin-mist" : ""}`}>
                    <td className="px-3.5 py-3 font-bold whitespace-nowrap">
                      {w.label}
                      <NotCounted payroll={w.payroll} />
                    </td>
                    <td className="px-3.5 py-3">{w.payroll.days.length}</td>
                    <td className={`px-3.5 py-3 whitespace-nowrap ${w.payroll.deductions ? "font-semibold text-stamp" : "text-admin-subtle"}`}>
                      {duration(w.payroll.lateUnderMinutes)}
                    </td>
                    <td className={`px-3.5 py-3 whitespace-nowrap ${w.payroll.overtimeMinutes ? "font-semibold text-roast-medium-ink" : "text-admin-subtle"}`}>
                      {duration(w.payroll.overtimeMinutes)}
                    </td>
                    <td className="px-3.5 py-3 text-right font-bold whitespace-nowrap">{totalCell(w.payroll)}</td>
                    <td className="px-3.5 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => openDrawer(w.monday)}
                        className="rounded px-1 text-[13px] font-bold text-admin-slate underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-admin-slate"
                      >
                        View<span className="sr-only"> week {w.label}</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Phone list */}
          <ul className="space-y-2 md:hidden">
            {weeks.map((w) => (
              <li key={w.monday}>
                <button
                  type="button"
                  onClick={() => openDrawer(w.monday)}
                  className="block w-full rounded-[10px] border border-admin-line bg-white p-3.5 text-left tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-admin-slate"
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="font-bold">{w.label}</span>
                    <span className="font-bold">{totalCell(w.payroll)}</span>
                  </span>
                  <span className="mt-1 block text-[13px] text-admin-subtle">
                    {w.payroll.days.length} {w.payroll.days.length === 1 ? "day" : "days"} · Late/early {duration(w.payroll.lateUnderMinutes)} · OT{" "}
                    {duration(w.payroll.overtimeMinutes)}
                  </span>
                  <NotCounted payroll={w.payroll} />
                </button>
              </li>
            ))}
          </ul>

          <div className="mt-3 flex items-center justify-end gap-3 rounded-[10px] border border-admin-line bg-white px-4 py-3 tabular-nums">
            <span className="text-[13px] text-admin-subtle">
              Range total · {total.days.length} {total.days.length === 1 ? "day" : "days"}
            </span>
            <span className="text-base font-extrabold">{totalCell(total)}</span>
          </div>
        </>
      )}

      <Sheet open={open !== null} onOpenChange={(isOpen) => !isOpen && setOpen(null)}>
        {viewing && (
          <PayrollDrawer key={shown.n} staff={staff} label={viewing.label} payroll={viewing.payroll} onClose={() => setOpen(null)} />
        )}
      </Sheet>
    </>
  );
}
