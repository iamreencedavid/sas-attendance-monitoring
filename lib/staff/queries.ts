import "server-only";
import { createAdminClient } from "@/lib/supabase/server";
import type { Staff } from "@/lib/punch/types";

/** Active staff for the punch page. Only id, name and role leave the server. */
export async function getActiveStaff(): Promise<Staff[]> {
  const { data, error } = await createAdminClient()
    .from("staff")
    .select("id, name, role")
    .eq("active", true)
    .order("name");
  if (error) throw new Error(`Loading staff failed: ${error.message}`);
  return data;
}
