import type { PunchType, StaffRole } from "@/lib/punch/types";

export type TodayStatus = "late" | "on_shift" | "done" | "not_in" | "missing_out";

export type TodayPunch = {
  type: PunchType;
  /** Minutes since the shift day's midnight; passes 1440 on an overnight shift. */
  minutes: number;
  time: string; // HH:MM
  /** The staff shift start copied onto the punch when it was made. */
  shiftStart: string; // HH:MM
  /** 1-hour signed URL, or null for a manual or purged punch. */
  photoUrl: string | null;
};

/** One staff member's day, fully computed on the server. */
export type StaffToday = {
  id: string;
  name: string;
  role: StaffRole;
  shiftStart: string; // HH:MM
  shiftEnd: string; // HH:MM
  status: TodayStatus;
  punches: TodayPunch[];
  /** How late the first IN was against the shift start; 0 when on time or no IN. */
  lateMinutes: number;
  /** Minutes past shift start with no IN (status "late"). */
  overdueMinutes: number;
  /** True when a "late" shift has already ended with no punch at all. */
  shiftOver: boolean;
  /** IN→OUT time so far, an open IN counted up to now. */
  workedMinutes: number;
};

export type TodayBoard = {
  dateLabel: string;
  time: string;
  staff: StaffToday[];
};
