"use client";

import { useMemo, useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { calculatePayroll } from "@/lib/monitoring/payroll";
import type { ShiftRow } from "@/lib/monitoring/types";
import type { StaffRecord } from "@/lib/staff/types";
import { PayrollDialog } from "./PayrollDialog";

/**
 * Enabled only when the searched filter is one staff member (`?staff=`), so
 * the dialog always matches the table on screen.
 */
export function PayrollButton({
  staff,
  shifts,
  from,
  to,
}: {
  staff: StaffRecord | null;
  shifts: ShiftRow[];
  from: string;
  to: string;
}) {
  const [open, setOpen] = useState(false);
  const payroll = useMemo(() => (staff ? calculatePayroll(shifts, staff) : null), [shifts, staff]);

  return (
    <div className="flex flex-col items-end gap-1 print:hidden">
      <button
        type="button"
        disabled={!staff}
        aria-describedby={staff ? undefined : "payroll-hint"}
        onClick={() => setOpen(true)}
        className="rounded-md bg-admin-slate px-3.5 py-2 text-sm font-bold text-white outline-none hover:bg-admin-slate/90 focus-visible:ring-2 focus-visible:ring-admin-slate focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Calculate Payroll
      </button>
      {!staff && (
        <p id="payroll-hint" className="text-right text-xs text-admin-subtle">
          Pick one staff member and Search to calculate payroll.
        </p>
      )}
      {staff && payroll && (
        <Dialog open={open} onOpenChange={setOpen}>
          <PayrollDialog staff={staff} from={from} to={to} payroll={payroll} onClose={() => setOpen(false)} />
        </Dialog>
      )}
    </div>
  );
}
