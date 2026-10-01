import { connection } from "next/server";
import { Kiosk } from "@/components/kiosk/Kiosk";
import { getActiveStaff } from "@/lib/staff/queries";
import type { Staff } from "@/lib/punch/types";

export default async function Home() {
  // Render per request so newly added or deactivated staff show up right away.
  await connection();

  let staff: Staff[] = [];
  let loadError = false;
  try {
    staff = await getActiveStaff();
  } catch (err) {
    console.error(err);
    loadError = true;
  }

  return <Kiosk staff={staff} loadError={loadError} />;
}
