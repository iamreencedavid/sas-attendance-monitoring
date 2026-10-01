import "server-only";
import type { User } from "@supabase/supabase-js";
import { adminRole } from "@/lib/auth/roles";
import { createAdminClient } from "@/lib/supabase/server";
import { SHOP_TIMEZONE } from "@/lib/time";
import type { UserRecord } from "./types";

const PER_PAGE = 200;

const signInFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: SHOP_TIMEZONE,
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export function displayName(user: User): string {
  const name = user.user_metadata?.name;
  return typeof name === "string" && name.trim() ? name.trim() : (user.email ?? "").split("@")[0];
}

export function isDisabled(user: User): boolean {
  return !!user.banned_until && new Date(user.banned_until).getTime() > Date.now();
}

/** Everyone who can sign in to /admin: the owner first, then admins by name. */
export async function listUsers(): Promise<UserRecord[]> {
  const supabase = createAdminClient();
  const users: UserRecord[] = [];

  for (let page = 1; ; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: PER_PAGE });
    if (error) throw error;
    for (const user of data.users) {
      const role = adminRole(user);
      if (!role) continue;
      users.push({
        id: user.id,
        name: displayName(user),
        email: user.email ?? "",
        role,
        disabled: isDisabled(user),
        lastSignIn: user.last_sign_in_at ? signInFormat.format(new Date(user.last_sign_in_at)) : "Never",
      });
    }
    if (data.users.length < PER_PAGE) break;
  }

  return users.sort(
    (a, b) => Number(b.role === "owner") - Number(a.role === "owner") || a.name.localeCompare(b.name),
  );
}
