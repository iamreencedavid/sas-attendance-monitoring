import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/AdminShell";
import { requireAdmin } from "@/lib/auth/admin";

export const metadata: Metadata = {
  title: "Admin · Sip and Simple",
  robots: { index: false },
};

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const admin = await requireAdmin();

  return (
    <div className="flex min-h-dvh flex-1 bg-admin-paper font-admin text-admin-slate">
      <AdminShell adminEmail={admin.email}>{children}</AdminShell>
    </div>
  );
}
