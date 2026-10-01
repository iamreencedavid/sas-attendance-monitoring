"use client";

import Link from "next/link";
import { RoleChip } from "@/components/admin/staff/RoleChip";
import { DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Payroll } from "@/lib/monitoring/payroll";
import type { ShiftRow } from "@/lib/monitoring/types";
import { formatPeso } from "@/lib/staff/pay";
import type { StaffRecord } from "@/lib/staff/types";
import { formatDateKey, formatDuration } from "@/lib/time";

const peso = (centavos: number) => formatPeso(centavos / 100);
const duration = (minutes: number) => (minutes ? formatDuration(minutes) : "—");

const primaryBtn =
  "rounded-md bg-admin-slate px-3.5 py-2 text-sm font-bold text-white outline-none hover:bg-admin-slate/90 focus-visible:ring-2 focus-visible:ring-admin-slate focus-visible:ring-offset-2";
const secondaryBtn =
  "rounded-md border border-admin-line bg-white px-3.5 py-2 text-sm font-bold text-admin-slate outline-none hover:bg-admin-mist focus-visible:ring-2 focus-visible:ring-admin-slate";

function skippedReason(shift: ShiftRow): string {
  return { on_shift: "still on shift", missing_out: "Missing OUT", no_in: "IN missing", closed: "" }[shift.state];
}

function period(from: string, to: string): string {
  const year = to.slice(0, 4);
  return from === to ? `${formatDateKey(from)} ${year}` : `${formatDateKey(from)} – ${formatDateKey(to)} ${year}`;
}

export function PayrollDialog({
  staff,
  from,
  to,
  payroll,
  onClose,
}: {
  staff: StaffRecord;
  from: string;
  to: string;
  payroll: Payroll;
  onClose: () => void;
}) {
  const noDaily = staff.dailyRate === null;
  const noOt = staff.overtimeRate === null;

  return (
    <DialogContent
      data-print-area
      className="flex max-h-[85dvh] flex-col gap-0 overflow-hidden bg-white p-0 font-admin text-admin-slate sm:max-w-2xl print:absolute print:top-0 print:left-0 print:max-h-none print:w-full print:max-w-none print:translate-none print:overflow-visible print:shadow-none print:ring-0"
    >
      <DialogHeader className="gap-1.5 border-b border-admin-line px-5 pt-5 pb-4 sm:px-6">
        <DialogTitle className="text-lg font-extrabold tracking-tight">Payroll · {staff.name}</DialogTitle>
        <DialogDescription render={<div />} className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-admin-subtle tabular-nums">
          <RoleChip role={staff.role} />
          <span>{period(from, to)}</span>
          <span>
            · Daily rate {formatPeso(staff.dailyRate)} · OT {formatPeso(staff.overtimeRate)}
            {noOt ? "" : "/hr"}
          </span>
        </DialogDescription>
        <p className="text-xs text-admin-subtle">Using current rates. Late and early-leave minutes are deducted from the day&apos;s pay.</p>
      </DialogHeader>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6 print:overflow-visible">
        {(noDaily || noOt) && (
          <p role="alert" className="mb-3 rounded-md bg-roast-light px-3 py-2 text-[13px] font-semibold text-roast-light-ink">
            {noDaily ? `${staff.name}'s daily rate isn't set` : `${staff.name}'s overtime rate isn't set, so OT pays ₱0`}.{" "}
            <Link href="/admin/staff" className="underline underline-offset-2 print:hidden">Set it on the Staff page</Link>
          </p>
        )}

        {payroll.skipped.length > 0 && (
          <p className="mb-3 rounded-md bg-stamp/10 px-3 py-2 text-[13px] font-semibold text-stamp">
            {payroll.skipped.length} {payroll.skipped.length === 1 ? "shift" : "shifts"} not counted:{" "}
            {payroll.skipped.map((s) => `${formatDateKey(s.dateKey)} (${skippedReason(s)})`).join(", ")}. Fix{" "}
            {payroll.skipped.length === 1 ? "it" : "them"} in the table first.
          </p>
        )}

        {payroll.days.length === 0 ? (
          <p className="py-8 text-center text-sm text-admin-subtle">No completed shifts in this range.</p>
        ) : (
          <table className="w-full border-collapse text-[13px] tabular-nums">
            <thead>
              <tr className="text-left text-xs font-bold text-admin-subtle">
                <th className="py-2 pr-3 font-bold">Date</th>
                <th className="hidden py-2 pr-3 font-bold sm:table-cell print:table-cell">IN–OUT</th>
                <th className="py-2 pr-3 font-bold whitespace-nowrap">Late/early</th>
                <th className="py-2 pr-3 font-bold">OT</th>
                <th className="py-2 pr-3 text-right font-bold">Basic</th>
                <th className="py-2 text-right font-bold">OT pay</th>
              </tr>
            </thead>
            <tbody>
              {payroll.days.map((d) => (
                <tr key={d.shift.key} className="border-t border-[#eef0f2]">
                  <td className="py-2 pr-3 whitespace-nowrap">{formatDateKey(d.shift.dateKey)}</td>
                  <td className="hidden py-2 pr-3 whitespace-nowrap sm:table-cell print:table-cell">
                    {d.shift.in?.time}–{d.shift.out?.time}
                    {d.shift.outNextDay && <span className="text-admin-subtle"> +1</span>}
                  </td>
                  <td className={`py-2 pr-3 whitespace-nowrap ${d.deduction ? "font-semibold text-stamp" : "text-admin-subtle"}`}>
                    {duration(d.lateMinutes + d.undertimeMinutes)}
                  </td>
                  <td className={`py-2 pr-3 whitespace-nowrap ${d.overtimeMinutes ? "font-semibold text-roast-medium-ink" : "text-admin-subtle"}`}>
                    {duration(d.overtimeMinutes)}
                  </td>
                  <td className="py-2 pr-3 text-right whitespace-nowrap">{noDaily ? "—" : peso(d.basic)}</td>
                  <td className="py-2 text-right whitespace-nowrap">{d.otPay ? peso(d.otPay) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <DialogFooter className="m-0 block rounded-b-xl border-t border-admin-line bg-white px-5 py-4 sm:px-6">
        <dl className="space-y-1 text-[13px] tabular-nums">
          <div className="flex justify-between gap-3">
            <dt>
              Basic pay <span className="text-admin-subtle">· {payroll.days.length} {payroll.days.length === 1 ? "day" : "days"} × {formatPeso(staff.dailyRate)}</span>
            </dt>
            <dd>{noDaily ? "—" : peso(payroll.grossBasic)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt>
              Late / early leave <span className="text-admin-subtle">· {duration(payroll.lateUnderMinutes)}</span>
            </dt>
            <dd className={payroll.deductions ? "text-stamp" : ""}>{noDaily ? "—" : payroll.deductions ? `−${peso(payroll.deductions)}` : peso(0)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt>
              Overtime <span className="text-admin-subtle">· {duration(payroll.overtimeMinutes)} × {formatPeso(staff.overtimeRate)}{noOt ? "" : "/hr"}</span>
            </dt>
            <dd>{peso(payroll.otPay)}</dd>
          </div>
          <div className="flex justify-between gap-3 border-t border-admin-line pt-2 text-base font-extrabold">
            <dt>Total</dt>
            <dd>{noDaily ? "—" : peso(payroll.total)}</dd>
          </div>
        </dl>
        <div className="mt-3.5 flex justify-end gap-2 print:hidden">
          <button type="button" onClick={onClose} className={secondaryBtn}>Close</button>
          <button type="button" onClick={() => window.print()} disabled={noDaily} className={`${primaryBtn} disabled:opacity-60`}>
            Print / Save PDF
          </button>
        </div>
      </DialogFooter>
    </DialogContent>
  );
}
