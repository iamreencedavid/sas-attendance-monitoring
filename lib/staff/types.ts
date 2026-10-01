import type { StaffRole } from "@/lib/punch/types";
import type { FieldErrors } from "./validation";

/** A staff member as the admin sees them. Never includes pin_hash. */
export type StaffRecord = {
  id: string;
  name: string;
  role: StaffRole;
  shiftStart: string; // HH:MM
  shiftEnd: string; // HH:MM
  /** Basic pay per day in pesos, or null when not set yet. */
  dailyRate: number | null;
  /** Overtime pay per hour in pesos, or null when not set yet. */
  overtimeRate: number | null;
  active: boolean;
  failedPinCount: number;
  /** Minutes until the PIN lockout ends, or null when not locked. Computed on the server. */
  lockMinutesLeft: number | null;
  createdAt: string;
};

export type ActionState = {
  ok: boolean;
  /** Bumps on every success so the drawer can react to repeat saves. */
  savedAt?: number;
  message?: string;
  errors?: FieldErrors;
};
