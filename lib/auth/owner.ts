import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { createSessionClient } from "@/lib/supabase/session";

/**
 * The signed-in owner's email, or null when nobody (or a non-owner) is signed
 * in. getUser() checks the session with Supabase Auth instead of trusting the
 * cookie. Owners are tagged app_metadata.role = 'owner' by `npm run db:owner`,
 * and only the secret key can set app_metadata.
 */
export const getOwnerEmail = cache(async (): Promise<string | null> => {
  const supabase = await createSessionClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user || data.user.app_metadata?.role !== "owner") return null;
  return data.user.email ?? "";
});

/** Whether the current request may use /admin. Server Actions check this. */
export async function isOwner(): Promise<boolean> {
  return (await getOwnerEmail()) !== null;
}

/** For /admin pages and layouts: send anyone else to /login. */
export async function requireOwner(): Promise<string> {
  const email = await getOwnerEmail();
  if (email === null) redirect("/login");
  return email;
}
