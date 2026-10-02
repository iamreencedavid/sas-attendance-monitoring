import "server-only";
import { createAdminClient } from "@/lib/supabase/server";
import { SHOP_TIMEZONE } from "@/lib/time";
import type { AppSettings } from "./types";

const dateTimeFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: SHOP_TIMEZONE,
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

/** The single settings row. A missing row reads as the defaults (no grace). */
export async function getSettings(): Promise<AppSettings> {
  const { data, error } = await createAdminClient()
    .from("app_settings")
    .select("grace_minutes, updated_at, updated_by_name")
    .eq("id", true)
    .maybeSingle();
  if (error) throw new Error(`Loading settings failed: ${error.message}`);
  return {
    graceMinutes: data?.grace_minutes ?? 0,
    updatedAt: data?.updated_at ? dateTimeFormat.format(new Date(data.updated_at)) : null,
    updatedBy: data?.updated_by_name ?? null,
  };
}
