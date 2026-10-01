import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { createSessionClient } from "@/lib/supabase/session";
import { adminRole, type AdminRole } from "./roles";

export type AdminUser = { id: string; email: string; role: AdminRole };

/**
 * The signed-in owner or admin, or null. getUser() checks the session with
 * Supabase Auth instead of trusting the cookie, so a disabled or deleted user
 * loses access on their next request. The owner is tagged by
 * `npm run db:owner`; admins are added on /admin/users.
 */
export const getAdminUser = cache(async (): Promise<AdminUser | null> => {
  const supabase = await createSessionClient();
  const { data, error } = await supabase.auth.getUser();
  const role = adminRole(data.user);
  if (error || !data.user || !role) return null;
  return { id: data.user.id, email: data.user.email ?? "", role };
});

/** Whether the current request may use /admin. Server Actions check this. */
export async function isAdmin(): Promise<boolean> {
  return (await getAdminUser()) !== null;
}

/** For /admin pages and layouts: send anyone else to /login. */
export async function requireAdmin(): Promise<AdminUser> {
  const user = await getAdminUser();
  if (!user) redirect("/login");
  return user;
}
