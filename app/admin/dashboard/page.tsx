import { notFound } from "next/navigation";
import { connection } from "next/server";
import { DashboardGrid } from "@/components/admin/dashboard/DashboardGrid";
import { isOwner } from "@/lib/auth/owner";
import { getTodayBoard } from "@/lib/dashboard/queries";
import type { TodayBoard } from "@/lib/dashboard/types";

export default async function DashboardPage() {
  // Layouts don't re-run on client navigation, so the page checks too.
  if (!(await isOwner())) notFound();
  await connection();

  let board: TodayBoard;
  try {
    board = await getTodayBoard();
  } catch (err) {
    console.error(err);
    return (
      <div role="alert" className="rounded-xl border border-admin-line bg-white p-6">
        <h1 className="text-2xl font-extrabold tracking-tight">Dashboard</h1>
        <p className="mt-2 text-sm text-stamp">
          Couldn&apos;t load staff from Supabase. Check the connection and reload the page.
        </p>
      </div>
    );
  }

  return <DashboardGrid board={board} />;
}
