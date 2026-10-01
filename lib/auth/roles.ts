import type { User } from "@supabase/supabase-js";

/** Who may sign in to /admin. Set in app_metadata.role, which only the secret key can write. */
export type AdminRole = "owner" | "admin";

/** The user's admin role, or null when they may not use /admin. Safe to import from proxy.ts. */
export function adminRole(user: User | null | undefined): AdminRole | null {
  const role = user?.app_metadata?.role;
  return role === "owner" || role === "admin" ? role : null;
}
