import "server-only";
import { createHash, randomBytes } from "node:crypto";

/** The registered-browser cookie. Holds a random token; the database keeps only its hash. */
export const DEVICE_COOKIE = "sas_device";

/** Chrome caps cookie lifetime at 400 days; each punch renews it. */
const MAX_AGE_SECONDS = 400 * 24 * 60 * 60;

export const DEVICE_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
  maxAge: MAX_AGE_SECONDS,
} as const;

const TOKEN = /^[A-Za-z0-9_-]{43}$/;

/** 32 random bytes, base64url (43 chars). */
export function newToken(): string {
  return randomBytes(32).toString("base64url");
}

/** sha256 hex of a token, or null when the cookie isn't a token we issued. */
export function hashToken(token: string | undefined): string | null {
  if (!token || !TOKEN.test(token)) return null;
  return createHash("sha256").update(token).digest("hex");
}
