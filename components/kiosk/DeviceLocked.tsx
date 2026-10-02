import { LockIcon } from "lucide-react";
import Link from "next/link";
import { KioskHeader } from "./KioskHeader";

/**
 * The punch page on a browser that isn't registered: no staff list, no
 * punching. The owner signs in here and registers it on /admin/devices.
 */
export function DeviceLocked({ browser }: { browser: string }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <KioskHeader />

      <main className="flex flex-1 items-center justify-center p-4 sm:p-8">
        <section className="flex w-full max-w-md flex-col items-center gap-3.5 rounded-2xl border border-latte bg-white px-6 pt-9 pb-7 text-center sm:px-9">
          <span className="flex size-14 items-center justify-center rounded-full bg-cream">
            <LockIcon aria-hidden="true" className="size-6 text-mocha" />
          </span>
          <h2 className="text-2xl font-bold">This device isn&apos;t registered</h2>
          <p className="text-[15px] leading-relaxed text-mocha">
            Punching only works on the shop&apos;s registered device. Ask the owner to register this browser.
          </p>
          <div className="mt-2 flex w-full flex-col items-center gap-2.5 border-t border-latte pt-4.5">
            <p className="text-[13px] text-mocha">Owner or admin?</p>
            <Link
              href="/login?next=/admin/devices"
              className="inline-flex min-h-11 items-center justify-center rounded-[10px] bg-espresso px-5.5 text-[15px] font-semibold text-cream outline-none hover:bg-espresso-soft focus-visible:ring-4 focus-visible:ring-caramel/40"
            >
              Sign in to register this browser
            </Link>
          </div>
        </section>
      </main>

      <footer className="px-6 pb-3.5 text-center text-xs text-mocha">This browser: {browser}</footer>
    </div>
  );
}
