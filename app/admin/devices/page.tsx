import { connection } from "next/server";
import { DevicesTable } from "@/components/admin/devices/DevicesTable";
import { requireAdmin } from "@/lib/auth/admin";
import { listDevices, thisBrowser } from "@/lib/devices/queries";
import type { DeviceRecord, ThisBrowser } from "@/lib/devices/types";

export default async function DevicesPage() {
  // Layouts don't re-run on client navigation, so the page checks too.
  await requireAdmin();
  await connection();

  let devices: DeviceRecord[];
  let browser: ThisBrowser;
  try {
    [devices, browser] = await Promise.all([listDevices(), thisBrowser()]);
  } catch (err) {
    console.error(err);
    return (
      <div role="alert" className="rounded-xl border border-admin-line bg-white p-6">
        <h1 className="text-2xl font-extrabold tracking-tight">Devices</h1>
        <p className="mt-2 text-sm text-stamp">
          Couldn&apos;t load devices from Supabase. Check the connection and reload the page.
        </p>
      </div>
    );
  }

  return <DevicesTable devices={devices} browser={browser} />;
}
