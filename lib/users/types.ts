import type { AdminRole } from "@/lib/auth/roles";
import type { FieldErrors } from "./validation";

/** Someone who can sign in to /admin, as the Users page shows them. */
export type UserRecord = {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  disabled: boolean;
  /** Formatted on the server in the shop timezone, e.g. "Oct 1, 9:12 AM", or "Never". */
  lastSignIn: string;
};

export type UserActionState = {
  ok: boolean;
  /** Bumps on every success so the drawer can react to repeat saves. */
  savedAt?: number;
  message?: string;
  errors?: FieldErrors;
};
