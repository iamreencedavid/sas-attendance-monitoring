import { PIN_MAX_ATTEMPTS } from "@/lib/punch/rules";

/** One dot per allowed attempt; red dots are wrong PINs. A lockout fills them all. */
export function PinMeter({ failed, locked }: { failed: number; locked: boolean }) {
  const used = locked ? PIN_MAX_ATTEMPTS : Math.min(failed, PIN_MAX_ATTEMPTS);
  const label = locked ? "Locked" : used === 0 ? "No wrong PINs" : `${used} wrong ${used === 1 ? "PIN" : "PINs"}`;

  return (
    <span role="img" aria-label={label} title={label} className="inline-flex gap-1">
      {Array.from({ length: PIN_MAX_ATTEMPTS }, (_, i) => (
        <i key={i} className={`size-2 rounded-full ${i < used ? "bg-stamp" : "bg-admin-line"}`} />
      ))}
    </span>
  );
}
