import { connection } from "next/server";
import { SettingsForm } from "@/components/admin/settings/SettingsForm";
import { requireAdmin } from "@/lib/auth/admin";
import { getSettings } from "@/lib/settings/queries";
import type { AppSettings } from "@/lib/settings/types";

export default async function SettingsPage() {
  // Layouts don't re-run on client navigation, so the page checks too.
  await requireAdmin();
  await connection();

  let settings: AppSettings;
  try {
    settings = await getSettings();
  } catch (err) {
    console.error(err);
    return (
      <div role="alert" className="rounded-xl border border-admin-line bg-white p-6">
        <h1 className="text-2xl font-extrabold tracking-tight">Settings</h1>
        <p className="mt-2 text-sm text-stamp">
          Couldn&apos;t load settings from Supabase. Check the connection and reload the page.
        </p>
      </div>
    );
  }

  return <SettingsForm settings={settings} />;
}
