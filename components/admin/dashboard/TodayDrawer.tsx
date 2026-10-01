import Link from "next/link";
import { RoleChip } from "@/components/admin/staff/RoleChip";
import { SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { StaffToday, TodayPunch } from "@/lib/dashboard/types";
import { describeShift } from "@/lib/staff/shift";
import { formatDuration } from "@/lib/time";
import { LateTag, PunchPhoto, statusLine } from "./StaffCard";
import { STATUS_BANDS, STATUS_LABELS } from "./status";

function PunchRow({ staff, punch, late }: { staff: StaffToday; punch: TodayPunch; late: boolean }) {
  return (
    <li className="flex items-center gap-3 py-3">
      <PunchPhoto
        staff={{ ...staff, punches: [punch] }}
        showTime={false}
        className="h-14 w-20 flex-none rounded-md [&_svg]:size-4"
      />
      <div className="min-w-0">
        <p className="font-bold tabular-nums">
          <span className={punch.type === "in" ? "text-ok" : "text-admin-slate"}>
            {punch.type === "in" ? "IN" : "OUT"}
          </span>{" "}
          {punch.time}
        </p>
        {late && <LateTag minutes={staff.lateMinutes} />}
      </div>
    </li>
  );
}

export function TodayDrawer({ staff }: { staff: StaffToday }) {
  const firstIn = staff.punches.findIndex((p) => p.type === "in");
  return (
    <SheetContent
      side="right"
      className="gap-0 overflow-y-auto bg-white p-0 font-admin text-admin-slate shadow-[-12px_0_32px_rgba(30,40,51,0.12)] data-[side=right]:w-full data-[side=right]:sm:max-w-md"
    >
      <SheetHeader className="px-5 pt-5 pb-4 sm:px-6">
        <SheetTitle className="text-lg font-extrabold tracking-tight">{staff.name}</SheetTitle>
        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[13px] text-admin-subtle tabular-nums">
          <RoleChip role={staff.role} />
          <span>
            {staff.shiftStart}–{staff.shiftEnd} · {describeShift(staff.shiftStart, staff.shiftEnd)}
          </span>
        </div>
      </SheetHeader>

      <div className="flex flex-1 flex-col px-5 pb-6 sm:px-6">
        <div className="rounded-[10px] border border-admin-line">
          <p className={`rounded-t-[9px] px-3.5 py-2 text-xs font-extrabold tracking-wider uppercase ${STATUS_BANDS[staff.status]}`}>
            {STATUS_LABELS[staff.status]}
          </p>
          <p className={`px-3.5 py-3 text-sm tabular-nums ${staff.status === "late" ? "font-semibold text-stamp" : ""}`}>
            {statusLine(staff)}
          </p>
        </div>

        <h3 className="mt-6 text-xs font-bold tracking-wider text-admin-subtle uppercase">Today</h3>
        {staff.punches.length === 0 ? (
          <p className="mt-2 text-sm text-admin-subtle">No punches yet today.</p>
        ) : (
          <ul className="divide-y divide-admin-line">
            {staff.punches.map((p, i) => (
              <PunchRow key={i} staff={staff} punch={p} late={i === firstIn && staff.lateMinutes > 0} />
            ))}
          </ul>
        )}

        <dl className="mt-4 flex items-center justify-between border-t border-admin-line pt-4 text-sm">
          <dt className="text-admin-subtle">{staff.status === "on_shift" ? "Hours so far" : "Hours today"}</dt>
          <dd className="font-bold tabular-nums">{formatDuration(staff.workedMinutes)}</dd>
        </dl>


        <Link
          href="/admin/staff"
          className="mt-auto pt-6 text-sm font-bold text-admin-slate underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-admin-slate"
        >
          Open in Staff →
        </Link>
      </div>
    </SheetContent>
  );
}
