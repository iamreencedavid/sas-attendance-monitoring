/** Shop-wide settings, as /admin/settings shows them. */
export type AppSettings = {
  /** Minutes after shift start before an IN counts as late (0–60). */
  graceMinutes: number;
  /** e.g. "Oct 2, 2026, 9:14 AM", or null if never saved. */
  updatedAt: string | null;
  updatedBy: string | null;
};

export const GRACE_MAX_MINUTES = 60;

export type SettingsActionState = {
  ok: boolean;
  /** Bumps on every success so the form can react to repeat saves. */
  savedAt?: number;
  message?: string;
  errors?: { graceMinutes?: string };
};
