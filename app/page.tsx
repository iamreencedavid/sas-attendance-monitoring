import { headers } from "next/headers";
import { connection } from "next/server";
import { DeviceLocked } from "@/components/kiosk/DeviceLocked";
import { Kiosk } from "@/components/kiosk/Kiosk";
import { describeBrowser, describeDevice } from "@/lib/devices/describe";
import { currentDevice } from "@/lib/devices/queries";
import { getActiveStaff } from "@/lib/staff/queries";
import type { Staff } from "@/lib/punch/types";

export default async function Home() {
  // Render per request so newly added or deactivated staff show up right away.
  await connection();

  // Only registered browsers see the staff list or can punch (lib/devices).
  let device;
  try {
    device = await currentDevice();
  } catch (err) {
    console.error(err);
    device = null;
  }
  if (!device) {
    const ua = (await headers()).get("user-agent") ?? "";
    return <DeviceLocked browser={`${describeBrowser(ua)} on ${describeDevice(ua)}`} />;
  }

  let staff: Staff[] = [];
  let loadError = false;
  try {
    staff = await getActiveStaff();
  } catch (err) {
    console.error(err);
    loadError = true;
  }

  return <Kiosk staff={staff} loadError={loadError} deviceName={device.name} />;
}
