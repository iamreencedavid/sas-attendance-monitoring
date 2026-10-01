import type { PunchType, StaffRole } from "@/lib/punch/types";

export type PunchSource = "kiosk" | "manual";

/** Where a kiosk punch came from (IP + approximate city). Record only. */
export type PunchWhere = {
  ip: string | null;
  /** "Quezon City, 00, PH"; null when the host sent no geo data. */
  label: string | null;
  /** Approximate map link when coordinates were recorded. */
  mapUrl: string | null;
};

/** One stored punch, with its time already in shop time. */
export type ShiftPunch = {
  id: string;
  staffId: string;
  type: PunchType;
  at: string; // ISO instant
  dateKey: string; // shop date, "2026-10-01"
  time: string; // shop time, "HH:MM"
  shiftStart: string; // copied onto the punch, "HH:MM"
  shiftEnd: string;
  source: PunchSource;
  note: string | null;
  photoPath: string | null;
  /** 1-hour signed URL, or null when there's no photo. */
  photoUrl: string | null;
  voidedAt: string | null;
  voidReason: string | null;
  /** Null for manual punches and punches recorded before location capture. */
  where: PunchWhere | null;
};

/**
 * closed: IN and OUT · on_shift: open IN under 16h · missing_out: open IN
 * over 16h · no_in: an OUT with no IN before it.
 */
export type ShiftState = "closed" | "on_shift" | "missing_out" | "no_in";

/** One table row: an IN paired with the OUT that follows it. */
export type ShiftRow = {
  key: string;
  staffId: string;
  staffName: string;
  role: StaffRole;
  /** Shop date of the IN (or of the OUT when there's no IN). */
  dateKey: string;
  shiftStart: string;
  shiftEnd: string;
  in: ShiftPunch | null;
  out: ShiftPunch | null;
  /** OUT falls on the day after the IN (overnight). */
  outNextDay: boolean;
  state: ShiftState;
  /** IN→OUT, or IN→now while on shift; null without an IN. */
  workedMinutes: number | null;
  lateMinutes: number;
  /** Minutes worked past the shift end (copied onto the IN); null until there's an IN and an OUT. */
  overtimeMinutes: number | null;
  /** Minutes the OUT came before the shift end (leaving early); null until there's an IN and an OUT. */
  undertimeMinutes: number | null;
  /** Any punch on the row was entered or changed by the owner. */
  edited: boolean;
  note: string | null;
  /** Voided punches that belonged to this shift, oldest first. */
  history: ShiftPunch[];
};

export type MonitoringFilters = { staffId: string; from: string; to: string };

export type ShiftField = "inTime" | "outTime" | "note";

export type ShiftActionState = {
  ok: boolean;
  savedAt?: number;
  message?: string;
  errors?: Partial<Record<ShiftField, string>>;
};
