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

export type PunchInput = {
  staffId: string;
  pin: string;
  type: PunchType;
  photo: Blob;
};

export type PunchResult =
  | { ok: true; name: string; type: PunchType; punchedAt: Date }
  | { ok: false; error: string };
