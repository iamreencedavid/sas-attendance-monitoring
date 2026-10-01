import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/AdminShell";
import { requireOwner } from "@/lib/auth/owner";

export const metadata: Metadata = {
  title: "Admin · Sip and Simple",
  robots: { index: false },
};

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const email = await requireOwner();

  return (
    <div className="flex min-h-dvh flex-1 bg-admin-paper font-admin text-admin-slate">
      <AdminShell ownerEmail={email}>{children}</AdminShell>
    </div>
  );
}
