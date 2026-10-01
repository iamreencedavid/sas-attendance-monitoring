import { shiftMinutes } from "@/lib/staff/shift";
import type { ShiftRow } from "./types";

export type PayrollRates = { dailyRate: number | null; overtimeRate: number | null };

export type PayrollDay = {
  shift: ShiftRow;
  scheduledMinutes: number;
  lateMinutes: number;
  undertimeMinutes: number;
  overtimeMinutes: number;
  /** Centavos. */
  basic: number;
  deduction: number;
  otPay: number;
};

export type Payroll = {
  days: PayrollDay[];
  /** Shifts in the range that can't be paid yet (On shift, Missing OUT, IN missing). */
  skipped: ShiftRow[];
  lateUnderMinutes: number;
  overtimeMinutes: number;
  /** All amounts in centavos. */
  grossBasic: number;
  deductions: number;
  netBasic: number;
  otPay: number;
  total: number;
};

const toCentavos = (pesos: number) => Math.round(pesos * 100);

/**
 * Pay for one staff member's shifts (owner's rules):
 * - each completed shift pays one daily rate, minus late and undertime at
 *   daily rate ÷ scheduled minutes per minute (never below zero);
 * - overtime pays exact minutes × hourly OT rate ÷ 60.
 * Uses the shift copied onto each IN, and works in centavos so totals add up.
 */
export function calculatePayroll(shifts: ShiftRow[], rates: PayrollRates): Payroll {
  const daily = toCentavos(rates.dailyRate ?? 0);
  const otHourly = toCentavos(rates.overtimeRate ?? 0);
  const days: PayrollDay[] = [];
  const skipped: ShiftRow[] = [];

  // Oldest first reads like a payslip.
  for (const shift of [...shifts].reverse()) {
    if (shift.state !== "closed" || !shift.in) {
      skipped.push(shift);
      continue;
    }
    const scheduled = shiftMinutes(shift.in.shiftStart, shift.in.shiftEnd);
    const late = shift.lateMinutes;
    const under = shift.undertimeMinutes ?? 0;
    const overtime = shift.overtimeMinutes ?? 0;
    const deduction = Math.min(daily, Math.round((daily * (late + under)) / scheduled));
    days.push({
      shift,
      scheduledMinutes: scheduled,
      lateMinutes: late,
      undertimeMinutes: under,
      overtimeMinutes: overtime,
      basic: daily - deduction,
      deduction,
      otPay: Math.round((otHourly * overtime) / 60),
    });
  }

  const sum = (pick: (d: PayrollDay) => number) => days.reduce((total, d) => total + pick(d), 0);
  const grossBasic = daily * days.length;
  const deductions = sum((d) => d.deduction);
  const otPay = sum((d) => d.otPay);
  return {
    days,
    skipped,
    lateUnderMinutes: sum((d) => d.lateMinutes + d.undertimeMinutes),
    overtimeMinutes: sum((d) => d.overtimeMinutes),
    grossBasic,
    deductions,
    netBasic: grossBasic - deductions,
    otPay,
    total: grossBasic - deductions + otPay,
  };
}
