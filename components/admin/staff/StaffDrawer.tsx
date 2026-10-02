"use client";

import {
  startTransition,
  useActionState,
  useId,
  useState,
  type FormEvent,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
} from "react";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  createStaff,
  resetStaffPin,
  deleteStaff,
  setStaffActive,
  unlockStaff,
  updateStaff,
} from "@/lib/staff/actions";
import { describeChanges } from "@/lib/staff/changes";
import { pesoInput } from "@/lib/staff/pay";
import { describeShift, SHIFT_TIMES } from "@/lib/staff/shift";
import type { ActionState, StaffRecord } from "@/lib/staff/types";
import {
  parsePinForm,
  parseStaffForm,
  STAFF_ROLES,
  TIME_24H,
  type FieldErrors,
  type StaffField,
} from "@/lib/staff/validation";
import { PinMeter } from "./PinMeter";
import { ROLE_LABELS } from "./RoleChip";

export type DrawerMode = { kind: "new" } | { kind: "edit"; staff: StaffRecord };
type Action = (prev: ActionState, formData: FormData) => Promise<ActionState>;

/** What a form does with valid input: save now, ask first, or stop (e.g. nothing changed). */
type Decision = { errors: FieldErrors } | { next: "run" | "confirm" | "stop" };

const INITIAL: ActionState = { ok: false };

const inputClass =
  "w-full rounded-[7px] border bg-white px-3 py-2 text-sm tabular-nums outline-none focus-visible:border-admin-slate focus-visible:ring-2 focus-visible:ring-admin-slate/20";
const primaryBtn =
  "rounded-md bg-admin-slate px-3.5 py-2 text-sm font-bold text-white outline-none hover:bg-admin-slate/90 focus-visible:ring-2 focus-visible:ring-admin-slate focus-visible:ring-offset-2 disabled:opacity-60";
const secondaryBtn =
  "rounded-md border border-admin-line bg-white px-3.5 py-2 text-sm font-bold text-admin-slate outline-none hover:bg-admin-mist focus-visible:ring-2 focus-visible:ring-admin-slate disabled:opacity-60";
// Small buttons share one shape; each variant sets its own colours so no
// two bg-/text- utilities ever compete on the same element.
const smallBase =
  "rounded-md border px-2.5 py-1.5 text-[12.5px] font-bold outline-none focus-visible:ring-2 focus-visible:ring-admin-slate disabled:opacity-60";
const smallBtn = `${smallBase} border-admin-line bg-white text-admin-slate hover:bg-admin-mist`;
const smallPrimaryBtn = `${smallBase} border-admin-slate bg-admin-slate text-white hover:bg-admin-slate/90 focus-visible:ring-offset-2`;

/**
 * Wraps a Server Action for useActionState. Forms submit through onSubmit
 * (not `action=`), which avoids React's automatic form reset so typed values
 * survive a failed save. `decide` validates and picks run / confirm / stop;
 * on "confirm" the FormData waits until the confirm dialog's button is pressed.
 */
function useStaffAction(action: Action, onSuccess?: () => void) {
  const [clientErrors, setClientErrors] = useState<FieldErrors | null>(null);
  const [awaiting, setAwaiting] = useState<FormData | null>(null);
  const [state, dispatch, pending] = useActionState(async (prev: ActionState, fd: FormData) => {
    const result = await action(prev, fd);
    setAwaiting(null); // close the confirm dialog either way; errors show in the form
    if (result.ok) onSuccess?.();
    return result;
  }, INITIAL);

  function run(fd: FormData) {
    startTransition(() => dispatch(fd));
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>, decide: (fd: FormData) => Decision) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const decision = decide(fd);
    if ("errors" in decision) {
      setClientErrors(decision.errors);
      return;
    }
    setClientErrors(null);
    if (decision.next === "run") run(fd);
    if (decision.next === "confirm") setAwaiting(fd);
  }

  return {
    state,
    pending,
    errors: clientErrors ?? state.errors ?? {},
    handleSubmit,
    confirm: {
      open: awaiting !== null,
      onOpenChange: (open: boolean) => !open && setAwaiting(null),
      onConfirm: () => awaiting && run(awaiting),
      pending,
    },
  };
}

function Field({
  label,
  error,
  hint,
  children,
  id,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
  id: string;
}) {
  return (
    <div className="mb-3.5">
      <label htmlFor={id} className="mb-1.5 block text-[12.5px] font-bold">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-msg`} className="mt-1.5 text-xs font-semibold text-stamp">{error}</p>
      ) : hint ? (
        <p id={`${id}-msg`} className="mt-1.5 text-xs text-admin-subtle">{hint}</p>
      ) : null}
    </div>
  );
}

function TextInput({
  id,
  name,
  error,
  className = "",
  ...props
}: { id: string; name: StaffField; error?: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      id={id}
      name={name}
      aria-invalid={!!error}
      aria-describedby={`${id}-msg`}
      className={`${inputClass} ${error ? "border-stamp ring-2 ring-stamp/15" : "border-admin-line"} ${className}`}
      {...props}
    />
  );
}

function SelectInput({
  id,
  name,
  error,
  placeholder,
  options,
  ...props
}: {
  id: string;
  name: StaffField;
  error?: string;
  placeholder: string;
  options: string[];
} & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select
        id={id}
        name={name}
        aria-invalid={!!error}
        aria-describedby={`${id}-msg`}
        className={`${inputClass} cursor-pointer appearance-none pr-9 ${error ? "border-stamp ring-2 ring-stamp/15" : "border-admin-line"} ${props.value ? "" : "text-admin-subtle"}`}
        {...props}
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((time) => (
          <option key={time} value={time} className="text-admin-slate">
            {time}
          </option>
        ))}
      </select>
      <svg
        aria-hidden="true"
        viewBox="0 0 20 20"
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 fill-admin-subtle"
      >
        <path d="M5.3 7.3a1 1 0 0 1 1.4 0L10 10.6l3.3-3.3a1 1 0 1 1 1.4 1.4l-4 4a1 1 0 0 1-1.4 0l-4-4a1 1 0 0 1 0-1.4Z" />
      </svg>
    </div>
  );
}

/** Peso amount with a fixed ₱ prefix; blank means "Not set". */
function PesoInput({
  id,
  name,
  error,
  ...props
}: { id: string; name: StaffField; error?: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="relative">
      <span aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-admin-subtle">
        ₱
      </span>
      <TextInput id={id} name={name} error={error} inputMode="decimal" autoComplete="off" placeholder="Not set" className="pl-7" {...props} />
    </div>
  );
}

/** Hourly choices, plus a saved off-the-hour time so editing never drops it. */
function timeOptions(current: string): string[] {
  return current && !SHIFT_TIMES.includes(current)
    ? [...SHIFT_TIMES, current].sort()
    : SHIFT_TIMES;
}

/* ---------- Main add/edit form ---------- */

function StaffForm({ mode, onClose }: { mode: DrawerMode; onClose: () => void }) {
  const uid = useId();
  const editing = mode.kind === "edit" ? mode.staff : null;
  const [shiftStart, setShiftStart] = useState(editing?.shiftStart ?? "");
  const [shiftEnd, setShiftEnd] = useState(editing?.shiftEnd ?? "");
  const [changes, setChanges] = useState<string[]>([]);
  const [notice, setNotice] = useState<string | null>(null);

  const form = useStaffAction(editing ? updateStaff : createStaff, onClose);
  const { state, pending, errors } = form;

  // Adding saves straight away; editing lists the changes and asks first.
  function decide(fd: FormData): Decision {
    setNotice(null);
    const parsed = parseStaffForm(fd, { withPin: !editing });
    if (!parsed.ok) return { errors: parsed.errors };
    if (!editing) return { next: "run" };

    const diff = describeChanges(editing, parsed.data);
    if (diff.length === 0) {
      setNotice("No changes to save.");
      return { next: "stop" };
    }
    setChanges(diff);
    return { next: "confirm" };
  }

  const readout =
    TIME_24H.test(shiftStart) && TIME_24H.test(shiftEnd) && shiftStart !== shiftEnd
      ? describeShift(shiftStart, shiftEnd)
      : null;

  return (
    <form onSubmit={(e) => form.handleSubmit(e, decide)} noValidate>
      {editing && <input type="hidden" name="id" value={editing.id} />}

      <Field label="Name" id={`${uid}-name`} error={errors.name}>
        <TextInput
          id={`${uid}-name`}
          name="name"
          error={errors.name}
          defaultValue={editing?.name}
          autoComplete="off"
          maxLength={60}
          autoFocus={!editing}
        />
      </Field>

      <fieldset className="mb-3.5">
        <legend className="mb-1.5 text-[12.5px] font-bold">Role</legend>
        <div className="flex gap-1.5">
          {STAFF_ROLES.map((role) => (
            <label key={role} className="flex-1">
              <input
                type="radio"
                name="role"
                value={role}
                defaultChecked={editing ? editing.role === role : role === "barista"}
                className="peer sr-only"
              />
              <span
                className={`block cursor-pointer rounded-[7px] border border-admin-line bg-white py-2 text-center text-[13px] font-bold text-admin-subtle peer-checked:border-transparent peer-focus-visible:ring-2 peer-focus-visible:ring-admin-slate ${checkedTone(role)}`}
              >
                {ROLE_LABELS[role]}
              </span>
            </label>
          ))}
        </div>
        {errors.role && <p className="mt-1.5 text-xs font-semibold text-stamp">{errors.role}</p>}
      </fieldset>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Shift starts" id={`${uid}-start`} error={errors.shiftStart} hint="24-hour time">
          <SelectInput
            id={`${uid}-start`}
            name="shiftStart"
            error={errors.shiftStart}
            value={shiftStart}
            onChange={(e) => setShiftStart(e.target.value)}
            placeholder="Choose start"
            options={timeOptions(editing?.shiftStart ?? "")}
          />
        </Field>
        <Field label="Shift ends" id={`${uid}-end`} error={errors.shiftEnd}>
          <SelectInput
            id={`${uid}-end`}
            name="shiftEnd"
            error={errors.shiftEnd}
            value={shiftEnd}
            onChange={(e) => setShiftEnd(e.target.value)}
            placeholder="Choose end"
            options={timeOptions(editing?.shiftEnd ?? "")}
          />
        </Field>
      </div>
      <p aria-live="polite" className="-mt-1 mb-3.5 min-h-6">
        {readout && (
          <span className="inline-block rounded-md bg-admin-mist px-2.5 py-1 text-[12.5px] font-bold text-admin-subtle">
            {readout}
          </span>
        )}
      </p>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Daily rate" id={`${uid}-daily`} error={errors.dailyRate} hint="Basic pay per day">
          <PesoInput id={`${uid}-daily`} name="dailyRate" error={errors.dailyRate} defaultValue={pesoInput(editing?.dailyRate ?? null)} />
        </Field>
        <Field label="Overtime per hour" id={`${uid}-ot`} error={errors.overtimeRate} hint="Paid per extra hour">
          <PesoInput id={`${uid}-ot`} name="overtimeRate" error={errors.overtimeRate} defaultValue={pesoInput(editing?.overtimeRate ?? null)} />
        </Field>
      </div>

      {!editing && (
        <div className="grid grid-cols-2 gap-3">
          <Field label="PIN" id={`${uid}-pin`} error={errors.pin} hint="4–6 digits, typed on the punch page">
            <TextInput id={`${uid}-pin`} name="pin" error={errors.pin} type="password" inputMode="numeric" maxLength={6} autoComplete="new-password" />
          </Field>
          <Field label="Confirm PIN" id={`${uid}-pin2`} error={errors.pinConfirm}>
            <TextInput id={`${uid}-pin2`} name="pinConfirm" error={errors.pinConfirm} type="password" inputMode="numeric" maxLength={6} autoComplete="new-password" />
          </Field>
        </div>
      )}

      {state.message && !state.errors?.name && (
        <p role="alert" className="mb-3 text-sm font-semibold text-stamp">{state.message}</p>
      )}
      {notice && (
        <p role="status" className="mb-3 text-sm font-semibold text-admin-subtle">{notice}</p>
      )}
      <div className="flex justify-end gap-2.5 border-t border-[#eef0f2] pt-3.5">
        <button type="button" onClick={onClose} className={secondaryBtn}>Cancel</button>
        <button type="submit" disabled={pending} className={primaryBtn}>
          {pending ? "Saving…" : editing ? "Save changes" : "Add staff"}
        </button>
      </div>

      {editing && (
        <ConfirmDialog
          {...form.confirm}
          title={`Save changes to ${editing.name}?`}
          description="These changes take effect right away, including on the punch page."
          confirmLabel="Save changes"
        >
          <ul className="space-y-1.5 rounded-lg border border-admin-line bg-[#fbfbfc] px-3.5 py-3 text-[13px] font-semibold tabular-nums">
            {changes.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </ConfirmDialog>
      )}
    </form>
  );
}

function checkedTone(role: (typeof STAFF_ROLES)[number]) {
  // Tailwind needs literal class names, so map each tone to its peer-checked variant.
  return {
    barista: "peer-checked:bg-roast-light peer-checked:text-roast-light-ink",
    kitchen: "peer-checked:bg-roast-medium peer-checked:text-roast-medium-ink",
    supervisor: "peer-checked:bg-roast-dark peer-checked:text-roast-dark-ink",
  }[role] satisfies string;
}

/* ---------- PIN box (edit only) ---------- */

function PinBox({ staff }: { staff: StaffRecord }) {
  const uid = useId();
  const [resetting, setResetting] = useState(false);
  const unlock = useStaffAction(unlockStaff);
  const reset = useStaffAction(resetStaffPin, () => setResetting(false));

  const locked = !!staff.lockMinutesLeft;
  const text = locked
    ? `Locked after 5 wrong tries. Unlocks in ${staff.lockMinutesLeft} min.`
    : staff.failedPinCount > 0
      ? `${staff.failedPinCount} wrong ${staff.failedPinCount === 1 ? "try" : "tries"} since the last correct PIN.`
      : "PIN set. No wrong tries.";

  return (
    <section
      aria-label="PIN"
      className={`mb-5 rounded-lg border px-3.5 py-3 ${locked ? "border-[#f0c9c0] bg-[#fdf3f0]" : "border-admin-line bg-[#fbfbfc]"}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <PinMeter failed={staff.failedPinCount} locked={locked} />
          <p className={`mt-1 text-[13px] font-semibold ${locked ? "text-[#8f2f20]" : "text-admin-subtle"}`}>{text}</p>
        </div>
        <div className="flex gap-2">
          {locked && (
            <form onSubmit={(e) => unlock.handleSubmit(e, () => ({ next: "run" }))}>
              <input type="hidden" name="id" value={staff.id} />
              <button type="submit" disabled={unlock.pending} className={smallBtn}>
                {unlock.pending ? "Unlocking…" : "Unlock"}
              </button>
            </form>
          )}
          {!resetting && (
            <button type="button" onClick={() => setResetting(true)} className={smallBtn}>Reset PIN</button>
          )}
        </div>
      </div>

      {unlock.state.message && <p role="alert" className="mt-2 text-xs font-semibold text-stamp">{unlock.state.message}</p>}
      {reset.state.ok && !resetting && <p role="status" className="mt-2 text-xs font-semibold text-ok">PIN reset.</p>}

      {resetting && (
        <form
          onSubmit={(e) =>
            reset.handleSubmit(e, (fd) => {
              const parsed = parsePinForm(fd);
              return parsed.ok ? { next: "confirm" } : { errors: parsed.errors };
            })
          }
          noValidate
          className="mt-3 border-t border-admin-line pt-3"
        >
          <input type="hidden" name="id" value={staff.id} />
          <div className="grid grid-cols-2 gap-3">
            <Field label="New PIN" id={`${uid}-pin`} error={reset.errors.pin} hint="4–6 digits">
              <TextInput id={`${uid}-pin`} name="pin" error={reset.errors.pin} type="password" inputMode="numeric" maxLength={6} autoComplete="new-password" autoFocus />
            </Field>
            <Field label="Confirm PIN" id={`${uid}-pin2`} error={reset.errors.pinConfirm}>
              <TextInput id={`${uid}-pin2`} name="pinConfirm" error={reset.errors.pinConfirm} type="password" inputMode="numeric" maxLength={6} autoComplete="new-password" />
            </Field>
          </div>
          {reset.state.message && <p role="alert" className="mb-2 text-xs font-semibold text-stamp">{reset.state.message}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setResetting(false)} className={smallBtn}>Cancel</button>
            <button type="submit" disabled={reset.pending} className={smallPrimaryBtn}>
              {reset.pending ? "Saving…" : "Save new PIN"}
            </button>
          </div>

          <ConfirmDialog
            {...reset.confirm}
            title={`Reset ${staff.name}'s PIN?`}
            description="Their old PIN stops working right away. Any lockout is cleared."
            confirmLabel="Reset PIN"
          />
        </form>
      )}
    </section>
  );
}

/* ---------- Deactivate / reactivate and delete (edit only) ---------- */

const linkBtn = "rounded px-0 text-sm font-bold outline-none hover:underline focus-visible:ring-2 focus-visible:ring-admin-slate";

function StaffActions({ staff, onDone }: { staff: StaffRecord; onDone: () => void }) {
  return (
    <div className="mt-6 flex flex-wrap items-start gap-x-6 gap-y-3 border-t border-[#eef0f2] pt-4">
      <ActiveToggle staff={staff} onDone={onDone} />
      <DeleteStaff staff={staff} onDone={onDone} />
    </div>
  );
}

function ActiveToggle({ staff, onDone }: { staff: StaffRecord; onDone: () => void }) {
  const toggle = useStaffAction(setStaffActive, onDone);
  const verb = staff.active ? "Deactivate" : "Reactivate";

  return (
    <form onSubmit={(e) => toggle.handleSubmit(e, () => ({ next: "confirm" }))}>
      <input type="hidden" name="id" value={staff.id} />
      <input type="hidden" name="active" value={String(!staff.active)} />
      <button
        type="submit"
        className={`${linkBtn} ${staff.active ? "text-stamp" : "text-admin-slate"}`}
      >
        {verb}
      </button>
      {toggle.state.message && <p role="alert" className="mt-2 text-xs font-semibold text-stamp">{toggle.state.message}</p>}

      <ConfirmDialog
        {...toggle.confirm}
        title={`${verb} ${staff.name}?`}
        description={
          staff.active
            ? "They'll disappear from the punch page. Their record is kept and you can reactivate them anytime."
            : "They'll appear on the punch page again."
        }
        confirmLabel={verb}
        tone={staff.active ? "danger" : "default"}
      />
    </form>
  );
}

/** Permanently erases the staff member with all their punches and photos. */
function DeleteStaff({ staff, onDone }: { staff: StaffRecord; onDone: () => void }) {
  const remove = useStaffAction(deleteStaff, onDone);

  return (
    <form onSubmit={(e) => remove.handleSubmit(e, () => ({ next: "confirm" }))}>
      <input type="hidden" name="id" value={staff.id} />
      <button type="submit" className={`${linkBtn} text-stamp`}>
        Delete staff
      </button>
      {remove.state.message && <p role="alert" className="mt-2 text-xs font-semibold text-stamp">{remove.state.message}</p>}

      <ConfirmDialog
        {...remove.confirm}
        title={`Delete ${staff.name}?`}
        description={`This permanently erases ${staff.name} and all of their punches and photos. Their attendance and payroll history will be gone. This can't be undone.`}
        confirmLabel="Delete staff"
        tone="danger"
      />
    </form>
  );
}

/* ---------- Drawer content (rendered inside StaffTable's <Sheet>) ---------- */

export function StaffDrawer({ mode, onClose }: { mode: DrawerMode; onClose: () => void }) {
  const title = mode.kind === "edit" ? `Edit ${mode.staff.name}` : "Add staff";

  return (
    <SheetContent
      side="right"
      className="gap-0 overflow-y-auto bg-white p-0 font-admin text-admin-slate shadow-[-12px_0_32px_rgba(30,40,51,0.12)] data-[side=right]:w-full data-[side=right]:sm:max-w-md"
    >
      <SheetHeader className="px-5 pt-5 pb-5 sm:px-6">
        <SheetTitle className="text-lg font-extrabold tracking-tight">{title}</SheetTitle>
      </SheetHeader>
      <div className="flex flex-1 flex-col px-5 pb-6 sm:px-6">
        {mode.kind === "edit" && <PinBox staff={mode.staff} />}
        <StaffForm mode={mode} onClose={onClose} />
        {mode.kind === "edit" && <StaffActions staff={mode.staff} onDone={onClose} />}
      </div>
    </SheetContent>
  );
}
