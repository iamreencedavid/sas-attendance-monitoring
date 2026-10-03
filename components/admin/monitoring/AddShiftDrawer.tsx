"use client";

import { startTransition, useActionState, useEffect, useId, useRef, useState, type FormEvent } from "react";
import { SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { addShift } from "@/lib/monitoring/actions";
import type { AddShiftStaff, AddShiftState } from "@/lib/monitoring/types";
import { shiftOn } from "@/lib/staff/shift";
import { TIME_24H } from "@/lib/staff/validation";
import { borderClass, FieldMessage, inputClass, primaryBtn, secondaryBtn, TimeField } from "./fields";

const INITIAL: AddShiftState = { ok: false };

function scheduleHint(staff: AddShiftStaff | undefined, dateKey: string): string {
  if (!staff || !dateKey) return "";
  const shift = shiftOn(staff, dateKey);
  return shift === "off" ? "Day off on this date" : `Shift ${shift.start}–${shift.end}`;
}

export function AddShiftDrawer({
  staff,
  today,
  defaultStaffId,
  onAdded,
  onClose,
}: {
  staff: AddShiftStaff[];
  today: string;
  defaultStaffId: string;
  onAdded: (added: { staffId: string; dateKey: string }) => void;
  onClose: () => void;
}) {
  const uid = useId();
  const [staffId, setStaffId] = useState(staff.some((s) => s.id === defaultStaffId) ? defaultStaffId : "");
  const [dateKey, setDateKey] = useState(today);
  const [inTime, setInTime] = useState("");
  const [outTime, setOutTime] = useState("");
  const [note, setNote] = useState("");
  const [clientErrors, setClientErrors] = useState<AddShiftState["errors"] | null>(null);
  const [state, dispatch, pending] = useActionState(addShift, INITIAL);

  // Once per save, even if onAdded changes after the page navigates.
  const handled = useRef<number | undefined>(undefined);
  useEffect(() => {
    if (!state.ok || !state.added || handled.current === state.savedAt) return;
    handled.current = state.savedAt;
    onAdded(state.added);
  }, [state, onAdded]);

  // Errors show until the next edit; server ones come back on the next save.
  const [showServer, setShowServer] = useState(true);
  function edit<T>(set: (value: T) => void) {
    return (value: T) => {
      set(value);
      setClientErrors(null);
      setShowServer(false);
    };
  }
  const errors = clientErrors ?? (showServer ? state.errors : undefined) ?? {};
  const outNextDay = !!(TIME_24H.test(inTime) && TIME_24H.test(outTime) && outTime <= inTime);
  const selected = staff.find((s) => s.id === staffId);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const next: NonNullable<AddShiftState["errors"]> = {};
    if (!staffId) next.staffId = "Choose a staff member.";
    if (!dateKey) next.dateKey = "Choose a date.";
    else if (dateKey > today) next.dateKey = "That date hasn't happened yet.";
    if (!inTime) next.inTime = "Enter an IN time.";
    else if (!TIME_24H.test(inTime)) next.inTime = "Use 24-hour time, e.g. 08:00.";
    if (outTime && !TIME_24H.test(outTime)) next.outTime = "Use 24-hour time, e.g. 16:00.";
    if (!note.trim()) next.note = "Add a note saying why this entry was added.";
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
        <SheetTitle className="text-lg font-extrabold tracking-tight">Add time entry</SheetTitle>
        <p className="mt-1 text-[13px] text-admin-subtle">For a shift that wasn&apos;t punched at the kiosk.</p>
      </SheetHeader>

      <form onSubmit={handleSubmit} noValidate className="flex flex-1 flex-col px-5 pb-6 sm:px-6">
        <div>
          <label htmlFor={`${uid}-staff`} className="mb-1.5 block text-[12.5px] font-bold">Staff</label>
          <select
            id={`${uid}-staff`}
            name="staffId"
            value={staffId}
            onChange={(e) => edit(setStaffId)(e.target.value)}
            aria-invalid={!!errors.staffId}
            aria-describedby={`${uid}-staff-msg`}
            className={`${inputClass} cursor-pointer ${borderClass(errors.staffId)}`}
          >
            <option value="">Select staff</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <FieldMessage id={`${uid}-staff-msg`} error={errors.staffId} />
        </div>

        <div className="mt-1">
          <label htmlFor={`${uid}-date`} className="mb-1.5 block text-[12.5px] font-bold">Date</label>
          <input
            id={`${uid}-date`}
            type="date"
            name="dateKey"
            value={dateKey}
            max={today}
            onChange={(e) => edit(setDateKey)(e.target.value)}
            aria-invalid={!!errors.dateKey}
            aria-describedby={`${uid}-date-msg`}
            className={`${inputClass} ${borderClass(errors.dateKey)}`}
          />
          <FieldMessage id={`${uid}-date-msg`} error={errors.dateKey} hint={scheduleHint(selected, dateKey)} />
        </div>

        <div className="mt-1 grid grid-cols-2 gap-3">
          <TimeField
            id={`${uid}-in`}
            label="IN time"
            name="inTime"
            value={inTime}
            onChange={edit(setInTime)}
            error={errors.inTime}
            hint="24-hour, e.g. 08:00"
          />
          <TimeField
            id={`${uid}-out`}
            label="OUT time"
            name="outTime"
            value={outTime}
            onChange={edit(setOutTime)}
            error={errors.outTime}
            hint={outNextDay ? "Next day" : "Empty = still on shift"}
          />
        </div>

        <div className="mt-1">
          <label htmlFor={`${uid}-note`} className="mb-1.5 block text-[12.5px] font-bold">Notes</label>
          <textarea
            id={`${uid}-note`}
            name="note"
            value={note}
            onChange={(e) => edit(setNote)(e.target.value)}
            rows={3}
            maxLength={300}
            placeholder="e.g. Forgot to punch, tablet was offline"
            aria-invalid={!!errors.note}
            aria-describedby={`${uid}-note-msg`}
            className={`${inputClass} resize-y ${borderClass(errors.note)}`}
          />
          <FieldMessage id={`${uid}-note-msg`} error={errors.note} hint="Required. Says why the entry was added." />
        </div>

        {showServer && state.message && <p role="alert" className="mt-3 text-[13px] font-semibold text-stamp">{state.message}</p>}

        <div className="mt-4 flex gap-2">
          <button type="submit" disabled={pending} className={primaryBtn}>
            {pending ? "Adding…" : "Add entry"}
          </button>
          <button type="button" onClick={onClose} className={secondaryBtn}>Cancel</button>
        </div>
      </form>
    </SheetContent>
  );
}
