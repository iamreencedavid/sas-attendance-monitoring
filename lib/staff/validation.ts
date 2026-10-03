import type { StaffRole } from "@/lib/punch/types";
import { MAX_PESOS, PESO_INPUT } from "./pay";
import type { SaturdayShift } from "./shift";

export const STAFF_ROLES: StaffRole[] = ["barista", "kitchen", "barista_kitchen", "supervisor", "social_manager"];

export const TIME_24H = /^([01]\d|2[0-3]):[0-5]\d$/;
const PIN = /^\d{4,6}$/;

export type StaffField =
  | "name"
  | "role"
  | "shiftStart"
  | "shiftEnd"
  | "saturdayMode"
  | "saturdayStart"
  | "saturdayEnd"
  | "dailyRate"
  | "overtimeRate"
  | "pin"
  | "pinConfirm";
export type FieldErrors = Partial<Record<StaffField, string>>;

export type StaffInput = {
  name: string;
  role: StaffRole;
  shiftStart: string;
  shiftEnd: string;
  saturday: SaturdayShift;
  dailyRate: number | null;
  overtimeRate: number | null;
  pin?: string;
};

type Parsed<T> = { ok: true; data: T } | { ok: false; errors: FieldErrors };

function str(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

/** Blank → null; otherwise pesos ≥ 0 with up to 2 decimals. */
function checkPeso(formData: FormData, key: "dailyRate" | "overtimeRate", errors: FieldErrors): number | null {
  const raw = str(formData, key).replace(/[₱,\s]/g, "");
  if (!raw) return null;
  const amount = Number(raw);
  if (!PESO_INPUT.test(raw) || amount >= MAX_PESOS) {
    errors[key] = "Enter an amount like 650 or 650.50.";
    return null;
  }
  return amount;
}

/** "same" (or missing) → weekday shift; "off"; "shift" needs its own start and end. */
function checkSaturday(formData: FormData, errors: FieldErrors): SaturdayShift {
  const mode = str(formData, "saturdayMode") || "same";
  if (mode === "same") return { kind: "same" };
  if (mode === "off") return { kind: "off" };
  if (mode !== "shift") {
    errors.saturdayMode = "Choose how Saturday works.";
    return { kind: "same" };
  }
  const start = str(formData, "saturdayStart");
  const end = str(formData, "saturdayEnd");
  if (!start) errors.saturdayStart = "Choose a Saturday start.";
  else if (!TIME_24H.test(start)) errors.saturdayStart = "Use 24-hour time, e.g. 08:00.";
  if (!end) errors.saturdayEnd = "Choose a Saturday end.";
  else if (!TIME_24H.test(end)) errors.saturdayEnd = "Use 24-hour time, e.g. 14:00.";
  else if (start === end) errors.saturdayEnd = "Start and end can't be the same time.";
  return { kind: "shift", start, end };
}

function checkPin(formData: FormData, errors: FieldErrors): string {
  const pin = str(formData, "pin");
  if (!PIN.test(pin)) errors.pin = "PIN must be 4–6 digits.";
  else if (pin !== str(formData, "pinConfirm")) errors.pinConfirm = "PINs don't match.";
  return pin;
}

/** Shared by the drawer form and the Server Actions, so both enforce the same rules. */
export function parseStaffForm(formData: FormData, { withPin }: { withPin: boolean }): Parsed<StaffInput> {
  const errors: FieldErrors = {};

  const name = str(formData, "name");
  if (!name) errors.name = "Enter a name.";
  else if (name.length > 60) errors.name = "Keep the name under 60 characters.";

  const role = str(formData, "role") as StaffRole;
  if (!STAFF_ROLES.includes(role)) errors.role = "Choose a role.";

  const shiftStart = str(formData, "shiftStart");
  const shiftEnd = str(formData, "shiftEnd");
  if (!shiftStart) errors.shiftStart = "Choose a start time.";
  else if (!TIME_24H.test(shiftStart)) errors.shiftStart = "Use 24-hour time, e.g. 06:00.";
  if (!shiftEnd) errors.shiftEnd = "Choose an end time.";
  else if (!TIME_24H.test(shiftEnd)) errors.shiftEnd = "Use 24-hour time, e.g. 14:00.";
  else if (shiftStart === shiftEnd) errors.shiftEnd = "Start and end can't be the same time.";

  const saturday = checkSaturday(formData, errors);

  const dailyRate = checkPeso(formData, "dailyRate", errors);
  const overtimeRate = checkPeso(formData, "overtimeRate", errors);

  const pin = withPin ? checkPin(formData, errors) : undefined;

  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, data: { name, role, shiftStart, shiftEnd, saturday, dailyRate, overtimeRate, pin } };
}

export function parsePinForm(formData: FormData): Parsed<{ pin: string }> {
  const errors: FieldErrors = {};
  const pin = checkPin(formData, errors);
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, data: { pin } };
}
