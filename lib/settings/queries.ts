import "server-only";
import { unstable_cache } from "next/cache";
import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/server";
import { SHOP_TIMEZONE } from "@/lib/time";
import type { AppSettings } from "./types";

/** Cache tag for the settings row. Anything that writes `app_settings` must revalidate it. */
export const SETTINGS_TAG = "app-settings";

const dateTimeFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: SHOP_TIMEZONE,
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

type SettingsRow = { grace_minutes: number; updated_at: string | null; updated_by_name: string | null };

/**
 * The raw row from Next's data cache, shared by every request and user.
 * Supabase is read again only after `saveSettings` expires the tag, or after
 * an hour as a safety net for edits made outside the app.
 */
const readSettingsRow = unstable_cache(
  async (): Promise<SettingsRow | null> => {
    const { data, error } = await createAdminClient()
      .from("app_settings")
      .select("grace_minutes, updated_at, updated_by_name")
      .eq("id", true)
      .maybeSingle();
    if (error) throw new Error(`Loading settings failed: ${error.message}`);
    return data;
  },
  [SETTINGS_TAG],
  { tags: [SETTINGS_TAG], revalidate: 3600 },
);

/** The single settings row. A missing row reads as the defaults (no grace). */
export const getSettings = cache(async (): Promise<AppSettings> => {
  const row = await readSettingsRow();
  return {
    graceMinutes: row?.grace_minutes ?? 0,
    updatedAt: row?.updated_at ? dateTimeFormat.format(new Date(row.updated_at)) : null,
    updatedBy: row?.updated_by_name ?? null,
  };
});
