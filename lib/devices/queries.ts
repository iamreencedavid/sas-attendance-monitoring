import "server-only";
import { cookies, headers } from "next/headers";
import { cache } from "react";
import { requestLocation } from "@/lib/punch/location";
import { createAdminClient } from "@/lib/supabase/server";
import { SHOP_TIMEZONE } from "@/lib/time";
import { describeBrowser, describeDevice } from "./describe";
import { DEVICE_COOKIE, hashToken } from "./token";
import type { CurrentDevice, DeviceRecord, ThisBrowser } from "./types";

const dateTimeFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: SHOP_TIMEZONE,
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

function formatted(iso: string | null): string | null {
  return iso ? dateTimeFormat.format(new Date(iso)) : null;
}

/** The token hash in this request's device cookie, or null. */
export async function cookieTokenHash(): Promise<string | null> {
  return hashToken((await cookies()).get(DEVICE_COOKIE)?.value);
}

/**
 * The registered browser making this request, or null when it has no cookie,
 * an unknown token, or a revoked registration. The punch page and every
 * punch action check this on the server.
 */
export const currentDevice = cache(async (): Promise<CurrentDevice | null> => {
  const tokenHash = await cookieTokenHash();
  if (!tokenHash) return null;
  const { data, error } = await createAdminClient()
    .from("kiosk_devices")
    .select("id, name")
    .eq("token_hash", tokenHash)
    .is("revoked_at", null)
    .maybeSingle();
  if (error) throw new Error(`Loading the device failed: ${error.message}`);
  return data;
});

/** What the request's browser looks like, for the "This browser" banner. */
export async function thisBrowser(): Promise<ThisBrowser> {
  const requestHeaders = await headers();
  const ua = requestHeaders.get("user-agent") ?? "";
  const where = requestLocation(requestHeaders);
  const device = await currentDevice();
  return {
    deviceId: device?.id ?? null,
    deviceLabel: describeDevice(ua),
    browserLabel: describeBrowser(ua),
    ip: where.ip,
    city: where.city,
  };
}

type DeviceRow = {
  id: string;
  name: string;
  device_label: string | null;
  browser_label: string | null;
  screen: string | null;
  registered_by_name: string | null;
  created_at: string;
  last_seen_at: string | null;
  last_ip: string | null;
  last_city: string | null;
  revoked_at: string | null;
  revoked_by_name: string | null;
};

/** Every registered browser: active ones first, newest first. */
export async function listDevices(): Promise<DeviceRecord[]> {
  const supabase = createAdminClient();
  const [{ data, error }, current] = await Promise.all([
    supabase
      .from("kiosk_devices")
      .select(
        "id, name, device_label, browser_label, screen, registered_by_name, created_at, last_seen_at, last_ip, last_city, revoked_at, revoked_by_name",
      )
      .order("created_at", { ascending: false })
      .returns<DeviceRow[]>(),
    currentDevice(),
  ]);
  if (error) throw new Error(`Loading devices failed: ${error.message}`);

  // A handful of devices at most, so one count query each is fine.
  const counts = await Promise.all(
    data.map(async (d) => {
      const { count, error: countError } = await supabase
        .from("punches")
        .select("id", { count: "exact", head: true })
        .eq("device_id", d.id);
      if (countError) throw new Error(`Counting punches failed: ${countError.message}`);
      return count ?? 0;
    }),
  );

  return data
    .map((d, i): DeviceRecord => ({
      id: d.id,
      name: d.name,
      deviceLabel: d.device_label ?? "Unknown device",
      browserLabel: d.browser_label ?? "Unknown browser",
      screen: d.screen,
      revoked: d.revoked_at !== null,
      isThisBrowser: current?.id === d.id,
      registeredAt: formatted(d.created_at) ?? "",
      registeredBy: d.registered_by_name,
      lastUsed: formatted(d.last_seen_at) ?? "Never",
      lastIp: d.last_ip,
      lastCity: d.last_city,
      revokedAt: formatted(d.revoked_at),
      revokedBy: d.revoked_by_name,
      punchCount: counts[i],
    }))
    .sort((a, b) => Number(a.revoked) - Number(b.revoked));
}
