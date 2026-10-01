import type { StaffRole } from "@/lib/punch/types";
import type { StaffRecord } from "./types";
import type { StaffInput } from "./validation";

const ROLE_NAMES: Record<StaffRole, string> = {
  barista: "Barista",
  kitchen: "Kitchen",
  supervisor: "Supervisor",
};

/** Human-readable list of what an edit changes, e.g. "Role: Barista → Kitchen". Empty when nothing changed. */
export function describeChanges(before: StaffRecord, after: StaffInput): string[] {
  const changes: string[] = [];
  if (before.name !== after.name) changes.push(`Name: ${before.name} → ${after.name}`);
  if (before.role !== after.role) changes.push(`Role: ${ROLE_NAMES[before.role]} → ${ROLE_NAMES[after.role]}`);
  if (before.shiftStart !== after.shiftStart || before.shiftEnd !== after.shiftEnd) {
    changes.push(
      `Shift: ${before.shiftStart}–${before.shiftEnd} → ${after.shiftStart}–${after.shiftEnd}`,
    );
  }
  return changes;
}
