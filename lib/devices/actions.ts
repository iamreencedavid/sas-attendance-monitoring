"use server";

import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import { getAdminUser, type AdminUser } from "@/lib/auth/admin";
import { requestLocation } from "@/lib/punch/location";
import { createAdminClient } from "@/lib/supabase/server";
import { displayName } from "@/lib/users/queries";
import { describeBrowser, deviceLabel } from "./describe";
import { currentDevice } from "./queries";
import { DEVICE_COOKIE, DEVICE_COOKIE_OPTIONS, hashToken, newToken } from "./token";
import type { DeviceActionState } from "./types";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SCREEN = /^\d{2,5} × \d{2,5}$/;

const NOT_ALLOWED: DeviceActionState = { ok: false, message: "Not available." };
const SAVE_FAILED: DeviceActionState = { ok: false, message: "Couldn't save. Try again." };

function str(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

/** 1–60 characters, or the field error. */
function parseName(formData: FormData): { ok: true; name: string } | { ok: false; state: DeviceActionState } {
  const name = str(formData, "name").replace(/\s+/g, " ");
  if (!name) return { ok: false, state: { ok: false, errors: { name: "Enter a name for this device." } } };
  if (name.length > 60) return { ok: false, state: { ok: false, errors: { name: "Keep it under 60 characters." } } };
  return { ok: true, name };
}

/** The signed-in admin's display name, for "Registered by" / "Revoked by". */
async function adminName(me: AdminUser): Promise<string> {
  const { data } = await createAdminClient().auth.admin.getUserById(me.id);
  return (data.user ? displayName(data.user) : me.email).slice(0, 120);
}

function saved(): DeviceActionState {
  revalidatePath("/admin/devices");
  return { ok: true, savedAt: Date.now() };
}

/**
 * Registers the browser making this request: stores the hash of a fresh
 * token and puts the token in an httpOnly cookie. `model` and `screen` come
 * from the browser and are only labels, so they're length-checked and
 * otherwise trusted as-is.
 */
export async function registerThisBrowser(_prev: DeviceActionState, formData: FormData): Promise<DeviceActionState> {
  const me = await getAdminUser();
  if (!me) return NOT_ALLOWED;

  const parsed = parseName(formData);
  if (!parsed.ok) return parsed.state;

  const existing = await currentDevice();
  if (existing) return { ok: false, message: `This browser is already registered as "${existing.name}".` };

  const model = str(formData, "model").slice(0, 60) || null;
  const screenRaw = str(formData, "screen");
  const screen = SCREEN.test(screenRaw) ? screenRaw : null;

  const requestHeaders = await headers();
  const ua = (requestHeaders.get("user-agent") ?? "").slice(0, 512);
  const where = requestLocation(requestHeaders);

  const token = newToken();
  const { error } = await createAdminClient()
    .from("kiosk_devices")
    .insert({
      name: parsed.name,
      token_hash: hashToken(token),
      device_label: deviceLabel(ua, model).slice(0, 120),
      browser_label: describeBrowser(ua).slice(0, 60),
      screen,
      user_agent: ua,
      registered_by: me.id,
      registered_by_name: await adminName(me),
      last_ip: where.ip,
      last_city: where.city,
    });
  if (error) {
    console.error(error);
    return SAVE_FAILED;
  }

  (await cookies()).set(DEVICE_COOKIE, token, DEVICE_COOKIE_OPTIONS);
  revalidatePath("/");
  return saved();
}

export async function renameDevice(_prev: DeviceActionState, formData: FormData): Promise<DeviceActionState> {
  if (!(await getAdminUser())) return NOT_ALLOWED;
  const id = str(formData, "id");
  if (!UUID.test(id)) return SAVE_FAILED;
  const parsed = parseName(formData);
  if (!parsed.ok) return parsed.state;

  const { data, error } = await createAdminClient()
    .from("kiosk_devices")
    .update({ name: parsed.name })
    .eq("id", id)
    .select("id");
  if (error || data.length === 0) {
    if (error) console.error(error);
    return SAVE_FAILED;
  }
  revalidatePath("/");
  return saved();
}

/**
 * Revokes a device for good: it can't open the punch page or punch from its
 * next request. Its row and past punches stay. Registering it again makes a
 * new device.
 */
export async function revokeDevice(_prev: DeviceActionState, formData: FormData): Promise<DeviceActionState> {
  const me = await getAdminUser();
  if (!me) return NOT_ALLOWED;
  const id = str(formData, "id");
  if (!UUID.test(id)) return SAVE_FAILED;

  const { data, error } = await createAdminClient()
    .from("kiosk_devices")
    .update({ revoked_at: new Date().toISOString(), revoked_by_name: await adminName(me) })
    .eq("id", id)
    .is("revoked_at", null)
    .select("id");
  if (error || data.length === 0) {
    if (error) console.error(error);
    return { ok: false, message: "Couldn't revoke. It may already be revoked." };
  }

  // Revoking the browser you're on: drop its now-useless cookie too.
  const current = await currentDevice();
  if (current?.id === id) (await cookies()).delete(DEVICE_COOKIE);

  revalidatePath("/");
  return saved();
}
