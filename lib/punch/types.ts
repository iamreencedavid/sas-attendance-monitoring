export type PunchType = "in" | "out";

export type StaffRole = "barista" | "kitchen" | "supervisor";

export type Staff = {
  id: string;
  name: string;
  role: StaffRole;
};

export type LastPunch = {
  type: PunchType;
  punchedAt: Date;
};

/** What the kiosk needs when a name is picked. */
export type PunchState = {
  last: LastPunch | null;
  /** Time of today's counted IN (shop date), or null. */
  inToday: Date | null;
};

export type PunchResult =
  | { ok: true; name: string; type: PunchType; punchedAt: Date }
  | { ok: false; error: string };
