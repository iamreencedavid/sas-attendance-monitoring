"use client";

import { useState } from "react";
import { RoleChip } from "@/components/admin/staff/RoleChip";
import { Sheet } from "@/components/ui/sheet";
import type { ShiftPunch, ShiftRow } from "@/lib/monitoring/types";
import { formatDateKey, formatDuration } from "@/lib/time";
import { ShiftDrawer } from "./ShiftDrawer";
import { EditedMark, LateTag, PunchThumb } from "./Thumb";

function PunchCell({
  punch,
  name,
  late = 0,
  nextDay = false,
}: {
  punch: ShiftPunch;
  name: string;
  late?: number;
  nextDay?: boolean;
}) {
  return (
    <span className="flex items-center gap-2">
      <PunchThumb punch={punch} name={name} />
      <span className="flex flex-col items-start gap-0.5">
        <span className="font-bold">
          {punch.time}
          {nextDay && <span className="ml-1 text-[11px] font-semibold text-admin-subtle">+1 day</span>}
        </span>
        {late > 0 && <LateTag minutes={late} />}
      </span>
    </span>
  );
}

function OutCell({ shift }: { shift: ShiftRow }) {
  if (shift.out) return <PunchCell punch={shift.out} name={shift.staffName} nextDay={shift.outNextDay} />;
  if (shift.state === "missing_out") return <span className="text-[13px] font-bold text-stamp">! Missing OUT</span>;
  return <span className="text-[13px] font-bold text-ok">On shift</span>;
}

function InCell({ shift }: { shift: ShiftRow }) {
  if (shift.in) return <PunchCell punch={shift.in} name={shift.staffName} late={shift.lateMinutes} />;
  return <span className="text-[13px] font-bold text-stamp">! IN missing</span>;
}

function hours(shift: ShiftRow): string {
  if (shift.workedMinutes === null) return "—";
  return formatDuration(shift.workedMinutes) + (shift.state === "on_shift" ? " so far" : "");
}

function Overtime({ shift }: { shift: ShiftRow }) {
  if (!shift.overtimeMinutes) return <span className="text-admin-subtle">—</span>;
  return <span className="font-bold text-roast-medium-ink">{formatDuration(shift.overtimeMinutes)}</span>;
}

export function ShiftTable({ shifts }: { shifts: ShiftRow[] }) {
  const [open, setOpen] = useState<string | null>(null);
  // What the drawer last showed, kept while it animates closed.
  const [shown, setShown] = useState<{ key: string; n: number }>({ key: "", n: 0 });

  function openDrawer(key: string) {
    setOpen(key);
    setShown((prev) => ({ key, n: prev.n + 1 }));
  }

  // Look the row up from fresh props so the drawer shows saved changes.
  const editing = shifts.find((s) => s.key === shown.key);

  if (shifts.length === 0) {
    return (
      <p className="rounded-[10px] border border-admin-line bg-white px-4 py-10 text-center text-sm text-admin-subtle">
        No punches for these dates.
      </p>
    );
  }

  return (
    <>
      <p className="mb-2 text-xs text-admin-subtle">
        {shifts.length} {shifts.length === 1 ? "shift" : "shifts"}
      </p>

      {/* Desktop table */}
      <div className="hidden overflow-hidden rounded-[10px] border border-admin-line bg-white md:block">
        <table className="w-full border-collapse text-[13.5px]">
          <thead>
            <tr className="bg-[#fbfbfc] text-left text-xs font-bold text-admin-subtle">
              <th className="px-3.5 py-2.5 font-bold">Date</th>
              <th className="px-3.5 py-2.5 font-bold">Staff</th>
              <th className="px-3.5 py-2.5 font-bold">IN</th>
              <th className="px-3.5 py-2.5 font-bold">OUT</th>
              <th className="px-3.5 py-2.5 font-bold">Hours</th>
              <th className="px-3.5 py-2.5 font-bold">OT</th>
              <th className="px-3.5 py-2.5 font-bold">Notes</th>
              <th className="px-3.5 py-2.5"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {shifts.map((s) => (
              <tr key={s.key} className={`border-t border-[#eef0f2] align-middle tabular-nums ${open === s.key ? "bg-admin-mist" : ""}`}>
                <td className="px-3.5 py-2.5 whitespace-nowrap">{formatDateKey(s.dateKey)}</td>
                <td className="px-3.5 py-2.5">
                  <span className="flex flex-col items-start gap-1">
                    <span className="font-bold">{s.staffName}</span>
                    <RoleChip role={s.role} />
                  </span>
                </td>
                <td className="px-3.5 py-2.5"><InCell shift={s} /></td>
                <td className="px-3.5 py-2.5"><OutCell shift={s} /></td>
                <td className="px-3.5 py-2.5 whitespace-nowrap">{hours(s)}</td>
                <td className="px-3.5 py-2.5 whitespace-nowrap"><Overtime shift={s} /></td>
                <td className="max-w-56 px-3.5 py-2.5">
                  <span className="flex flex-col items-start gap-0.5">
                    {s.edited && <EditedMark />}
                    <span className="line-clamp-2 text-[13px] text-admin-subtle">{s.note ?? "—"}</span>
                  </span>
                </td>
                <td className="px-3.5 py-2.5 text-right">
                  <button
                    type="button"
                    onClick={() => openDrawer(s.key)}
                    className="rounded px-1 text-[13px] font-bold text-admin-slate underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-admin-slate"
                  >
                    Edit<span className="sr-only"> {s.staffName}, {formatDateKey(s.dateKey)}</span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Phone list */}
      <ul className="space-y-2 md:hidden">
        {shifts.map((s) => (
          <li key={s.key}>
            {/* A div with a full-card button behind the content, so the photos
                can be their own buttons (no button inside a button). */}
            <div className="relative rounded-[10px] border border-admin-line bg-white p-3.5 tabular-nums has-[>button:focus-visible]:ring-2 has-[>button:focus-visible]:ring-admin-slate">
              <button
                type="button"
                onClick={() => openDrawer(s.key)}
                aria-label={`Edit ${s.staffName}, ${formatDateKey(s.dateKey)}`}
                className="absolute inset-0 rounded-[10px] outline-none"
              />
              <span className="pointer-events-none relative flex items-center justify-between gap-2">
                <span className="font-bold">{s.staffName}</span>
                <span className="text-[13px] text-admin-subtle">{formatDateKey(s.dateKey)}</span>
              </span>
              <span className="pointer-events-none relative mt-2.5 grid grid-cols-2 gap-2 text-[13px] [&_button]:pointer-events-auto">
                <span>
                  <span className="mb-1 block text-[11px] font-bold text-admin-subtle">IN</span>
                  <InCell shift={s} />
                </span>
                <span>
                  <span className="mb-1 block text-[11px] font-bold text-admin-subtle">OUT</span>
                  <OutCell shift={s} />
                </span>
              </span>
              <span className="pointer-events-none relative mt-2.5 flex items-center justify-between gap-2 text-[13px]">
                <span>
                  {hours(s)}
                  {!!s.overtimeMinutes && (
                    <span className="font-bold text-roast-medium-ink"> · OT {formatDuration(s.overtimeMinutes)}</span>
                  )}
                </span>
                {s.edited && <EditedMark />}
              </span>
              {s.note && <span className="pointer-events-none relative mt-1 line-clamp-2 block text-[13px] text-admin-subtle">{s.note}</span>}
            </div>
          </li>
        ))}
      </ul>

      <Sheet open={open !== null} onOpenChange={(isOpen) => !isOpen && setOpen(null)}>
        {editing && <ShiftDrawer key={shown.n} shift={editing} onClose={() => setOpen(null)} />}
      </Sheet>
    </>
  );
}
