import { connection } from "next/server";
import { StaffTable } from "@/components/admin/staff/StaffTable";
import { requireAdmin } from "@/lib/auth/admin";
import { getAllStaff } from "@/lib/staff/queries";
import type { StaffRecord } from "@/lib/staff/types";

export default async function StaffPage() {
  // Layouts don't re-run on client navigation, so the page checks too.
  await requireAdmin();
  await connection();

  let staff: StaffRecord[];
  try {
    staff = await getAllStaff();
  } catch (err) {
    console.error(err);
    return (
      <div role="alert" className="rounded-xl border border-admin-line bg-white p-6">
        <h1 className="text-2xl font-extrabold tracking-tight">Staff</h1>
        <p className="mt-2 text-sm text-stamp">
          Couldn&apos;t load staff from Supabase. Check the connection and reload the page.
        </p>
      </div>
    );
  }

  return <StaffTable staff={staff} />;
}
