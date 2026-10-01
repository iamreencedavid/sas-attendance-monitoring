import type { StaffRole } from "@/lib/punch/types";

export const STAFF_ROLES: StaffRole[] = ["barista", "kitchen", "supervisor"];

export const TIME_24H = /^([01]\d|2[0-3]):[0-5]\d$/;
const PIN = /^\d{4,6}$/;

export type StaffField = "name" | "role" | "shiftStart" | "shiftEnd" | "pin" | "pinConfirm";
export type FieldErrors = Partial<Record<StaffField, string>>;

export type StaffInput = {
  name: string;
  role: StaffRole;
  shiftStart: string;
  shiftEnd: string;
  pin?: string;
};

type Parsed<T> = { ok: true; data: T } | { ok: false; errors: FieldErrors };

function str(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
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

  const pin = withPin ? checkPin(formData, errors) : undefined;

  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, data: { name, role, shiftStart, shiftEnd, pin } };
}

export function parsePinForm(formData: FormData): Parsed<{ pin: string }> {
  const errors: FieldErrors = {};
  const pin = checkPin(formData, errors);
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, data: { pin } };
}
