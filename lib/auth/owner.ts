import "server-only";

/**
 * Whether the current request may use /admin.
 *
 * There is no owner login yet, and the owner chose to open /admin in
 * production anyway, so this always allows. Anyone with the URL can manage
 * staff and reset PINs until the Supabase owner login lands; then this becomes
 * a session check and nothing else needs to change.
 */
export async function isOwner(): Promise<boolean> {
  return true;
}
