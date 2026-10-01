import { connection } from "next/server";
import { UsersTable } from "@/components/admin/users/UsersTable";
import { requireAdmin } from "@/lib/auth/admin";
import { listUsers } from "@/lib/users/queries";
import type { UserRecord } from "@/lib/users/types";

export default async function UsersPage() {
  // Layouts don't re-run on client navigation, so the page checks too.
  const me = await requireAdmin();
  await connection();

  let users: UserRecord[];
  try {
    users = await listUsers();
  } catch (err) {
    console.error(err);
    return (
      <div role="alert" className="rounded-xl border border-admin-line bg-white p-6">
        <h1 className="text-2xl font-extrabold tracking-tight">Users</h1>
        <p className="mt-2 text-sm text-stamp">
          Couldn&apos;t load users from Supabase. Check the connection and reload the page.
        </p>
      </div>
    );
  }

  return <UsersTable users={users} selfId={me.id} />;
}
