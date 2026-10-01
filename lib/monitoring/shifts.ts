import { STALE_IN_MS } from "@/lib/punch/rules";
import { toMinutes } from "@/lib/staff/shift";
import type { StaffRole } from "@/lib/punch/types";
import type { ShiftPunch, ShiftRow } from "./types";

type StaffInfo = { name: string; role: StaffRole };

function minutesBetween(from: string, to: string | Date): number {
  return Math.max(0, Math.round((new Date(to).getTime() - new Date(from).getTime()) / 60_000));
}

/**
 * Pairs each staff member's counted punches into shifts: an IN opens a
 * shift and the next OUT closes it; an OUT with nothing open is its own row.
 * Voided punches go into the history of the shift they belonged to.
 */
export function pairShifts(punches: ShiftPunch[], staff: Map<string, StaffInfo>, now: Date): ShiftRow[] {
  const sorted = [...punches].sort((a, b) => a.at.localeCompare(b.at));
  const rows: ShiftRow[] = [];

  const byStaff = Map.groupBy(sorted, (p) => p.staffId);
  for (const [staffId, list] of byStaff) {
    const info = staff.get(staffId);
    if (!info) continue;
    const mine: ShiftRow[] = [];
    let open: ShiftRow | null = null;

    const newRow = (p: ShiftPunch): ShiftRow => ({
      key: p.id,
      staffId,
      staffName: info.name,
      role: info.role,
      dateKey: p.dateKey,
      shiftStart: p.shiftStart,
      shiftEnd: p.shiftEnd,
      in: null,
      out: null,
      outNextDay: false,
      state: "no_in",
      workedMinutes: null,
      lateMinutes: 0,
      edited: false,
      note: null,
      history: [],
    });

    for (const p of list.filter((x) => !x.voidedAt)) {
      if (p.type === "in") {
        open = { ...newRow(p), in: p };
        mine.push(open);
      } else if (open) {
        open.out = p;
        open.outNextDay = p.dateKey !== open.dateKey;
        open = null;
      } else {
        mine.push({ ...newRow(p), out: p });
      }
    }

    // Voided punches: a replacement keeps the original's photo, so match on
    // that first; otherwise an IN goes to its date, an OUT to the latest IN before it.
    for (const v of list.filter((x) => x.voidedAt)) {
      const target =
        (v.photoPath && mine.find((r) => r.in?.photoPath === v.photoPath || r.out?.photoPath === v.photoPath)) ||
        (v.type === "in"
          ? mine.find((r) => r.dateKey === v.dateKey)
          : mine.filter((r) => r.in && r.in.at <= v.at).at(-1)) ||
        mine.find((r) => r.dateKey === v.dateKey);
      target?.history.push(v);
    }

    for (const r of mine) {
      if (r.in) {
        const stale = !r.out && now.getTime() - new Date(r.in.at).getTime() > STALE_IN_MS;
        r.state = r.out ? "closed" : stale ? "missing_out" : "on_shift";
        r.workedMinutes = r.out ? minutesBetween(r.in.at, r.out.at) : stale ? null : minutesBetween(r.in.at, now);
        r.lateMinutes = Math.max(0, toMinutes(r.in.time) - toMinutes(r.in.shiftStart));
      }
      r.edited = r.in?.source === "manual" || r.out?.source === "manual" || r.history.length > 0;
      r.note = r.in?.note ?? r.out?.note ?? null;
    }
    rows.push(...mine);
  }

  // Newest first.
  return rows.sort((a, b) => (b.in ?? b.out)!.at.localeCompare((a.in ?? a.out)!.at));
}
