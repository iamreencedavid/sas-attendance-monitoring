import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { isOwner } from "@/lib/auth/owner";

export const metadata: Metadata = {
  title: "Admin · Sip and Simple",
  robots: { index: false },
};

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  if (!(await isOwner())) notFound();

  return (
    <div className="flex min-h-dvh flex-1 bg-admin-paper font-admin text-admin-slate">
      <AdminShell>{children}</AdminShell>
    </div>
  );
}
