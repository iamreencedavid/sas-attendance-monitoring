import "server-only";
import { isIP } from "node:net";

export type PunchLocation = {
  ip: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
};

type HeaderReader = { get(name: string): string | null };

/** Trimmed text up to `max` chars, or null when empty. */
function text(value: string | null, max: number): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

/** Vercel URL-encodes the city ("Quezon%20City"); a bad encoding becomes null. */
function decoded(value: string | null): string | null {
  if (!value) return null;
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}

/** ISO 3166 alpha-2 ("PH"), or null. */
function country(value: string | null): string | null {
  const code = value?.trim().toUpperCase();
  return code && /^[A-Z]{2}$/.test(code) ? code : null;
}

function coordinate(value: string | null, limit: number): number | null {
  if (!value) return null;
  const n = Number(value);
  return Number.isFinite(n) && Math.abs(n) <= limit ? Math.round(n * 1e5) / 1e5 : null;
}

/**
 * Where a request came from, from the headers the host sets (Vercel
 * overwrites these, so the browser can't fake them in production). Record
 * only: anything missing or malformed is null, never an error. Under
 * `next dev` there are no geo headers and the IP is the local one.
 */
export function requestLocation(headers: HeaderReader): PunchLocation {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0];
  const rawIp = (headers.get("x-real-ip") ?? forwarded ?? "").trim();
  return {
    ip: isIP(rawIp) ? rawIp : null,
    city: text(decoded(headers.get("x-vercel-ip-city")), 100),
    region: text(headers.get("x-vercel-ip-country-region"), 100),
    country: country(headers.get("x-vercel-ip-country")),
    latitude: coordinate(headers.get("x-vercel-ip-latitude"), 90),
    longitude: coordinate(headers.get("x-vercel-ip-longitude"), 180),
  };
}
