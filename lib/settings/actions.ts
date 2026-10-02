"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { getAdminUser } from "@/lib/auth/admin";
import { createAdminClient } from "@/lib/supabase/server";
import { displayName } from "@/lib/users/queries";
import { SETTINGS_TAG } from "./queries";
import { GRACE_MAX_MINUTES, type SettingsActionState } from "./types";

export async function saveSettings(_prev: SettingsActionState, formData: FormData): Promise<SettingsActionState> {
  const me = await getAdminUser();
  if (!me) return { ok: false, message: "Not available." };

  const raw = formData.get("graceMinutes");
  const text = typeof raw === "string" ? raw.trim() : "";
  if (!/^\d{1,2}$/.test(text) || Number(text) > GRACE_MAX_MINUTES) {
    return { ok: false, errors: { graceMinutes: `Enter whole minutes from 0 to ${GRACE_MAX_MINUTES}.` } };
  }

  const supabase = createAdminClient();
  const { data: user } = await supabase.auth.admin.getUserById(me.id);
  const { error } = await supabase.from("app_settings").upsert({
    id: true,
    grace_minutes: Number(text),
    updated_at: new Date().toISOString(),
    updated_by_name: (user.user ? displayName(user.user) : me.email).slice(0, 120),
  });
  if (error) {
    console.error(error);
    return { ok: false, message: "Couldn't save. Try again." };
  }

  // Expire now, not stale-while-revalidate: Late and pay must use the new value.
  revalidateTag(SETTINGS_TAG, { expire: 0 });
  revalidatePath("/admin/settings");
  return { ok: true, savedAt: Date.now() };
}
