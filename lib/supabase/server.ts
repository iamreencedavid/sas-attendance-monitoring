import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Supabase client with the secret key. Bypasses RLS, so it must only run on
 * the server, after the caller has checked the PIN or owner session.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secretKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY (see .env.example).");
  }
  return createClient(url, secretKey, { auth: { persistSession: false } });
}
