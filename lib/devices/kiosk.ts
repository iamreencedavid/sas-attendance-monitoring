import "server-only";
import { cookies } from "next/headers";
import type { PunchLocation } from "@/lib/punch/location";
import { createAdminClient } from "@/lib/supabase/server";
import { currentDevice } from "./queries";
import { DEVICE_COOKIE, DEVICE_COOKIE_OPTIONS } from "./token";
import type { CurrentDevice } from "./types";

/** What the punch actions return when the browser isn't registered. */
export const DEVICE_NOT_REGISTERED = "This device isn't registered.";

/** The registered device making this request, or null. Punch actions refuse without one. */
export async function requireDevice(): Promise<CurrentDevice | null> {
  return currentDevice();
}

/**
 * After a successful punch: note when and where the device was last used,
 * and renew its cookie so a tablet in daily use never hits the 400-day cap.
 * Record only, so a failure here is logged and never fails the punch.
 */
export async function deviceUsed(device: CurrentDevice, where: PunchLocation): Promise<void> {
  const cookieStore = await cookies();
  const token = cookieStore.get(DEVICE_COOKIE)?.value;
  if (token) cookieStore.set(DEVICE_COOKIE, token, DEVICE_COOKIE_OPTIONS);

  const { error } = await createAdminClient()
    .from("kiosk_devices")
    .update({ last_seen_at: new Date().toISOString(), last_ip: where.ip, last_city: where.city })
    .eq("id", device.id);
  if (error) console.error(`Updating device last_seen failed: ${error.message}`);
}
