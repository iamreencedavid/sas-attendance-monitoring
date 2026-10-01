import "server-only";

/**
 * Whether the current request may use /admin.
 *
 * There is no owner login yet, so /admin and its Server Actions only work in
 * `next dev`. When the Supabase owner login lands, this becomes a session
 * check and nothing else needs to change.
 */
export async function isOwner(): Promise<boolean> {
  return process.env.NODE_ENV === "development";
}
