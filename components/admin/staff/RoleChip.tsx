import type { StaffRole } from "@/lib/punch/types";

export const ROLE_LABELS: Record<StaffRole, string> = {
  barista: "Barista",
  kitchen: "Kitchen",
  barista_kitchen: "Barista + Kitchen",
  supervisor: "Supervisor",
};

/** Roast scale: barista light, kitchen medium, supervisor dark; barista + kitchen is split light | medium. */
export const ROLE_TONES: Record<StaffRole, string> = {
  barista: "bg-roast-light text-roast-light-ink",
  kitchen: "bg-roast-medium text-roast-medium-ink",
  barista_kitchen: "bg-[linear-gradient(90deg,var(--color-roast-light)_50%,var(--color-roast-medium)_50%)] text-roast-medium-ink",
  supervisor: "bg-roast-dark text-roast-dark-ink",
};

export function RoleChip({ role, muted = false }: { role: StaffRole; muted?: boolean }) {
  return (
    <span
      className={`inline-block rounded-[5px] px-2 py-0.5 text-xs font-bold ${ROLE_TONES[role]} ${muted ? "opacity-60" : ""}`}
    >
      {ROLE_LABELS[role]}
    </span>
  );
}
