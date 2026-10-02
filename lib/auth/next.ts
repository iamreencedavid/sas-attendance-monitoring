/**
 * Where to go after sign-in. Only plain /admin paths are allowed, so a
 * crafted `?next=` can't send someone to another site.
 */
export function safeAdminPath(next: unknown): string {
  return typeof next === "string" && /^\/admin(\/[a-z0-9-]+)*$/.test(next) ? next : "/admin";
}
