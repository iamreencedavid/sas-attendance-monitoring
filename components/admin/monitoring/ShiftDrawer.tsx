"use client";

import { startTransition, useActionState, useEffect, useId, useState, type FormEvent } from "react";
import { RoleChip } from "@/components/admin/staff/RoleChip";
import { SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { updateShift } from "@/lib/monitoring/actions";
import type { ShiftActionState, ShiftPunch, ShiftRow } from "@/lib/monitoring/types";
import { TIME_24H } from "@/lib/staff/validation";
import { formatDateKey, formatDuration } from "@/lib/time";
import { LateTag, PunchThumb } from "./Thumb";

const INITIAL: ShiftActionState = { ok: false };

const inputClass =
  "w-full rounded-[7px] border bg-white px-3 py-2 text-sm tabular-nums outline-none focus-visible:border-admin-slate focus-visible:ring-2 focus-visible:ring-admin-slate/20";
const primaryBtn =
  "rounded-md bg-admin-slate px-3.5 py-2 text-sm font-bold text-white outline-none hover:bg-admin-slate/90 focus-visible:ring-2 focus-visible:ring-admin-slate focus-visible:ring-offset-2 disabled:opacity-60";
const secondaryBtn =
  "rounded-md border border-admin-line bg-white px-3.5 py-2 text-sm font-bold text-admin-slate outline-none hover:bg-admin-mist focus-visible:ring-2 focus-visible:ring-admin-slate disabled:opacity-60";

function PhotoBox({ label, punch, name }: { label: string; punch: ShiftPunch | null; name: string }) {
  return (
    <figure className="min-w-0">
      {punch ? (
        <PunchThumb punch={punch} name={name} className="aspect-[4/3] w-full" />
      ) : (
        <span className="flex aspect-[4/3] w-full items-center justify-center rounded-md border border-dashed border-admin-line text-xs text-admin-subtle">
          No {label}
        </span>
      )}
      <figcaption className="mt-1 text-xs font-bold text-admin-subtle">{label}</figcaption>
    </figure>
  );
}

function TimeField({
  id,
  label,
  name,
  value,
  onChange,
  error,
  hint,
}: {
  id: string;
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-[12.5px] font-bold">{label}</label>
      <input
        id={id}
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        inputMode="numeric"
        placeholder="HH:MM"
        maxLength={5}
        autoComplete="off"
        aria-invalid={!!error}
        aria-describedby={`${id}-msg`}
        className={`${inputClass} ${error ? "border-stamp ring-2 ring-stamp/15" : "border-admin-line"}`}
      />
      <div id={`${id}-msg`} className="mt-1.5 min-h-4 text-xs">
        {error ? <span className="font-semibold text-stamp">{error}</span> : <span className="text-admin-subtle">{hint}</span>}
      </div>
    </div>
  );
}

function HistoryItem({ punch, name }: { punch: ShiftPunch; name: string }) {
  return (
    <li className="flex items-start gap-3 py-2.5">
      <PunchThumb punch={punch} name={name} className="size-10" />
      <div className="min-w-0 text-[13px]">
        <p className="font-bold tabular-nums">
          <span className="line-through">
            {punch.type === "in" ? "IN" : "OUT"} {punch.time}
          </span>{" "}
          <span className="font-semibold text-admin-subtle">{punch.source}</span>
        </p>
        <p className="text-admin-subtle">{punch.voidReason}</p>
      </div>
    </li>
  );
}

export function ShiftDrawer({ shift, onClose }: { shift: ShiftRow; onClose: () => void }) {
  const uid = useId();
  const initial = { in: shift.in?.time ?? "", out: shift.out?.time ?? "", note: shift.note ?? "" };
  const [inTime, setInTime] = useState(initial.in);
  const [outTime, setOutTime] = useState(initial.out);
  const [note, setNote] = useState(initial.note);
  const [clientErrors, setClientErrors] = useState<ShiftActionState["errors"] | null>(null);
  const [state, dispatch, pending] = useActionState(updateShift, INITIAL);

  useEffect(() => {
    if (state.ok) onClose();
  }, [state, onClose]);

  // Errors show until the next edit; server ones come back on the next save.
  const [showServer, setShowServer] = useState(true);
  function clearErrors() {
    setClientErrors(null);
    setShowServer(false);
  }
  const errors = clientErrors ?? (showServer ? state.errors : undefined) ?? {};
  const changes = [
    initial.in !== inTime && inTime && `IN ${initial.in || "—"} → ${inTime}`,
    initial.out !== outTime && outTime && `OUT ${initial.out || "—"} → ${outTime}`,
  ].filter(Boolean) as string[];
  const outNextDay = !!(inTime && outTime && TIME_24H.test(inTime) && TIME_24H.test(outTime) && outTime <= inTime && shift.in);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const next: NonNullable<ShiftActionState["errors"]> = {};
    if (inTime && !TIME_24H.test(inTime)) next.inTime = "Use 24-hour time, e.g. 08:00.";
    if (outTime && !TIME_24H.test(outTime)) next.outTime = "Use 24-hour time, e.g. 16:00.";
    if (changes.length && !note.trim()) next.note = "Add a note saying why the time changed.";
    if (Object.keys(next).length) {
      setClientErrors(next);
      return;
    }
    setClientErrors(null);
    setShowServer(true);
    const fd = new FormData(e.currentTarget);
    startTransition(() => dispatch(fd));
  }

  return (
    <SheetContent
      side="right"
      className="gap-0 overflow-y-auto bg-white p-0 font-admin text-admin-slate shadow-[-12px_0_32px_rgba(30,40,51,0.12)] data-[side=right]:w-full data-[side=right]:sm:max-w-md"
    >
      <SheetHeader className="px-5 pt-5 pb-4 sm:px-6">
        <SheetTitle className="text-lg font-extrabold tracking-tight">Edit shift</SheetTitle>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-[13px] text-admin-subtle tabular-nums">
          <span className="font-bold text-admin-slate">{shift.staffName}</span>
          <RoleChip role={shift.role} />
          <span>{formatDateKey(shift.dateKey)}</span>
          <span>· Shift {shift.shiftStart}–{shift.shiftEnd}</span>
        </div>
      </SheetHeader>

      <form onSubmit={handleSubmit} noValidate className="flex flex-1 flex-col px-5 pb-6 sm:px-6">
        <input type="hidden" name="staffId" value={shift.staffId} />
        <input type="hidden" name="dateKey" value={shift.dateKey} />
        <input type="hidden" name="inId" value={shift.in?.id ?? ""} />
        <input type="hidden" name="outId" value={shift.out?.id ?? ""} />

        <div className="grid grid-cols-2 gap-3">
          <PhotoBox label="IN" punch={shift.in} name={shift.staffName} />
          <PhotoBox label="OUT" punch={shift.out} name={shift.staffName} />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <TimeField
            id={`${uid}-in`}
            label="IN time"
            name="inTime"
            value={inTime}
            onChange={(v) => {
              setInTime(v);
              clearErrors();
            }}
            error={errors.inTime}
            hint={shift.lateMinutes > 0 && inTime === initial.in ? <LateTag minutes={shift.lateMinutes} /> : "24-hour, e.g. 08:00"}
          />
          <TimeField
            id={`${uid}-out`}
            label="OUT time"
            name="outTime"
            value={outTime}
            onChange={(v) => {
              setOutTime(v);
              clearErrors();
            }}
            error={errors.outTime}
            hint={outNextDay ? "Next day" : shift.out ? "24-hour, e.g. 16:00" : "Empty = still on shift. Fill in to add the OUT."}
          />
        </div>

        {shift.out && shift.in && (
          <p className="mb-3 text-[13px] text-admin-subtle tabular-nums">
            Overtime:{" "}
            <span className={shift.overtimeMinutes ? "font-bold text-roast-medium-ink" : ""}>
              {shift.overtimeMinutes ? formatDuration(shift.overtimeMinutes) : "none"}
            </span>{" "}
            (after {shift.in.shiftEnd})
          </p>
        )}

        <div className="mt-2">
          <label htmlFor={`${uid}-note`} className="mb-1.5 block text-[12.5px] font-bold">Notes</label>
          <textarea
            id={`${uid}-note`}
            name="note"
            value={note}
            onChange={(e) => {
              setNote(e.target.value);
              clearErrors();
            }}
            rows={3}
            maxLength={300}
            aria-invalid={!!errors.note}
            aria-describedby={`${uid}-note-msg`}
            className={`${inputClass} resize-y ${errors.note ? "border-stamp ring-2 ring-stamp/15" : "border-admin-line"}`}
          />
          <p id={`${uid}-note-msg`} className="mt-1.5 text-xs">
            {errors.note ? (
              <span className="font-semibold text-stamp">{errors.note}</span>
            ) : (
              <span className="text-admin-subtle">Required when a time changes.</span>
            )}
          </p>
        </div>

        {changes.length > 0 && (
          <p className="mt-3 rounded-md bg-roast-light px-3 py-2 text-[13px] font-semibold text-roast-light-ink tabular-nums">
            Changing {changes.join(" and ")}. The original punch is kept as voided.
          </p>
        )}
        {showServer && state.message && <p role="alert" className="mt-3 text-[13px] font-semibold text-stamp">{state.message}</p>}

        <div className="mt-4 flex gap-2">
          <button type="submit" disabled={pending} className={primaryBtn}>
            {pending ? "Saving…" : "Save changes"}
          </button>
          <button type="button" onClick={onClose} className={secondaryBtn}>Cancel</button>
        </div>

        {shift.history.length > 0 && (
          <section className="mt-6 border-t border-admin-line pt-4">
            <h3 className="text-xs font-bold tracking-wider text-admin-subtle uppercase">History</h3>
            <ul className="divide-y divide-admin-line">
              {shift.history.map((p) => <HistoryItem key={p.id} punch={p} name={shift.staffName} />)}
            </ul>
          </section>
        )}
      </form>
    </SheetContent>
  );
}
