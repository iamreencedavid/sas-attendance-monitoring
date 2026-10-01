import { CameraIcon } from "lucide-react";
import { RoleChip } from "@/components/admin/staff/RoleChip";
import type { StaffToday } from "@/lib/dashboard/types";
import { formatDuration } from "@/lib/time";
import { STATUS_BANDS, STATUS_LABELS } from "./status";

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
}

export function LateTag({ minutes }: { minutes: number }) {
  return (
    <span className="inline-block rounded-[5px] bg-stamp/10 px-1.5 py-0.5 text-xs font-bold text-stamp">
      Late {formatDuration(minutes)}
    </span>
  );
}

/** The one-line summary under the name. */
export function statusLine(s: StaffToday): string {
  const first = s.punches[0];
  const last = s.punches.at(-1);
  switch (s.status) {
    case "on_shift":
      return `IN ${first?.time} · ${formatDuration(s.workedMinutes)} today`;
    case "done":
      return `${first?.time}–${last?.time} · ${formatDuration(s.workedMinutes)}`;
    case "late":
      return s.shiftOver
        ? `No punch · shift ${s.shiftStart}–${s.shiftEnd}`
        : `Shift ${s.shiftStart} · ${formatDuration(s.overdueMinutes)} overdue`;
    case "missing_out":
      return `IN ${last?.time}, no OUT`;
    case "not_in":
      return `Shift ${s.shiftStart}–${s.shiftEnd}`;
  }
}

/** Photo space: the latest punch (a placeholder until photos are stored), or initials. */
export function PunchPhoto({
  staff,
  className = "",
  showTime = true,
}: {
  staff: StaffToday;
  className?: string;
  showTime?: boolean;
}) {
  const last = staff.punches.at(-1);
  if (!last) {
    return (
      <div className={`flex items-center justify-center bg-admin-paper ${className}`}>
        <span className="flex size-14 items-center justify-center rounded-full bg-admin-mist text-lg font-extrabold text-admin-subtle">
          {initials(staff.name)}
        </span>
      </div>
    );
  }
  if (last.photoUrl) {
    return (
      <div className={`relative overflow-hidden bg-admin-mist ${className}`}>
        {/* Short-lived signed Supabase URL, so next/image optimisation doesn't apply. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={last.photoUrl} alt={`${staff.name} at ${last.time}`} className="size-full object-cover" />
        {showTime && (
          <span className="absolute bottom-1.5 left-1.5 rounded bg-black/60 px-1.5 py-0.5 text-xs font-bold text-white tabular-nums">
            {last.type === "in" ? "IN" : "OUT"} {last.time}
          </span>
        )}
      </div>
    );
  }
  return (
    <div className={`relative flex flex-col items-center justify-center gap-1 bg-admin-mist text-admin-subtle ${className}`}>
      <CameraIcon aria-hidden="true" className="size-6" />
      {showTime && (
        <span className="text-xs font-bold tabular-nums">
          {last.type === "in" ? "IN" : "OUT"} {last.time}
        </span>
      )}
    </div>
  );
}

export function StaffCard({
  staff,
  selected,
  onOpen,
}: {
  staff: StaffToday;
  selected: boolean;
  onOpen: () => void;
}) {
  const outlined = staff.status === "missing_out" || staff.status === "late";
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-haspopup="dialog"
      className={`flex w-full flex-col overflow-hidden rounded-[10px] border bg-white text-left tabular-nums outline-none transition-shadow hover:shadow-md focus-visible:ring-2 focus-visible:ring-admin-slate focus-visible:ring-offset-2 ${
        outlined ? "border-stamp/50" : "border-admin-line"
      } ${selected ? "ring-2 ring-admin-slate" : ""}`}
    >
      <span className={`px-3 py-1.5 text-xs font-extrabold tracking-wider uppercase ${STATUS_BANDS[staff.status]}`}>
        {STATUS_LABELS[staff.status]}
      </span>
      <PunchPhoto staff={staff} className="aspect-[4/3] w-full" />
      <span className="flex flex-1 flex-col gap-1.5 p-3">
        <span className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
          <span className="min-w-0 truncate font-bold">{staff.name}</span>
          <RoleChip role={staff.role} />
        </span>
        <span
          className={`text-[13px] ${staff.status === "late" ? "font-semibold text-stamp" : "text-admin-subtle"}`}
        >
          {statusLine(staff)}
        </span>
        {staff.lateMinutes > 0 && (
          <span>
            <LateTag minutes={staff.lateMinutes} />
          </span>
        )}
      </span>
    </button>
  );
}
