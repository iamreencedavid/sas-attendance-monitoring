import { BobbingCup } from "@/components/BobbingCup";
import type { PunchType } from "@/lib/punch/types";

/** Full-screen card while a punch is being saved; the PunchResult card follows it. */
export function PunchSaving({ name, type }: { name: string; type: PunchType }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="animate-loader-in fixed inset-0 z-10 flex items-center justify-center bg-espresso/80 p-4 backdrop-blur-sm"
    >
      <div className="flex w-full max-w-sm flex-col items-center gap-3 rounded-3xl bg-white px-6 pt-10 pb-8 text-center shadow-2xl">
        <BobbingCup className="size-24" />
        <p className={`mt-2 text-2xl font-bold ${type === "in" ? "text-punch-in" : "text-punch-out"}`}>
          Punching {type === "in" ? "IN" : "OUT"}…
        </p>
        <p className="text-[15px] text-mocha">{name}, hold on while we save your photo and time.</p>
      </div>
    </div>
  );
}
