import { Clock } from "./Clock";

export function KioskHeader() {
  return (
    <header className="flex items-center justify-between bg-espresso px-4 py-3 text-cream sm:px-6">
      <h1 className="text-sm font-bold tracking-[0.2em] sm:text-base">
        <span aria-hidden="true">☕ </span>SipAndSimple Attendance Monitoring
        System
      </h1>
      <p className="text-sm font-medium sm:text-base">
        <Clock />
      </p>
    </header>
  );
}
