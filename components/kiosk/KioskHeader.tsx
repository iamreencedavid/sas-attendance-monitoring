import Image from "next/image";
import cup from "@/public/brand/cup.png";
import { Clock } from "./Clock";

export function KioskHeader() {
  return (
    <header className="flex items-center justify-between bg-espresso px-4 py-3 text-cream sm:px-6">
      <h1 className="flex items-center gap-2 text-sm font-bold tracking-[0.2em] sm:text-base">
        <Image src={cup} alt="" priority className="size-7 flex-none" />
        SAS Attendance Monitoring
      </h1>
      <p className="text-sm font-medium sm:text-base">
        <Clock />
      </p>
    </header>
  );
}
