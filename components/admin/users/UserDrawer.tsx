"use client";

import {
  startTransition,
  useActionState,
  useId,
  useState,
  type FormEvent,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  createUser,
  deleteUser,
  resetUserPassword,
  setUserDisabled,
  updateUser,
} from "@/lib/users/actions";
import type { UserActionState, UserRecord } from "@/lib/users/types";
import {
  MIN_PASSWORD,
  parsePasswordForm,
  parseUserForm,
  type FieldErrors,
  type UserField,
} from "@/lib/users/validation";

export type UserDrawerMode = { kind: "new" } | { kind: "edit"; user: UserRecord };
type Action = (prev: UserActionState, formData: FormData) => Promise<UserActionState>;

/** What a form does with valid input: save now, ask first, or stop (e.g. nothing changed). */
type Decision = { errors: FieldErrors } | { next: "run" | "confirm" | "stop" };

const INITIAL: UserActionState = { ok: false };

const inputClass =
  "w-full rounded-[7px] border bg-white px-3 py-2 text-sm outline-none focus-visible:border-admin-slate focus-visible:ring-2 focus-visible:ring-admin-slate/20";
const primaryBtn =
  "rounded-md bg-admin-slate px-3.5 py-2 text-sm font-bold text-white outline-none hover:bg-admin-slate/90 focus-visible:ring-2 focus-visible:ring-admin-slate focus-visible:ring-offset-2 disabled:opacity-60";
const secondaryBtn =
  "rounded-md border border-admin-line bg-white px-3.5 py-2 text-sm font-bold text-admin-slate outline-none hover:bg-admin-mist focus-visible:ring-2 focus-visible:ring-admin-slate disabled:opacity-60";
const smallBase =
  "rounded-md border px-2.5 py-1.5 text-[12.5px] font-bold outline-none focus-visible:ring-2 focus-visible:ring-admin-slate disabled:opacity-60";
const smallBtn = `${smallBase} border-admin-line bg-white text-admin-slate hover:bg-admin-mist`;
const smallPrimaryBtn = `${smallBase} border-admin-slate bg-admin-slate text-white hover:bg-admin-slate/90 focus-visible:ring-offset-2`;

/**
 * Wraps a Server Action for useActionState, like the staff drawer: forms
 * submit through onSubmit so typed values survive a failed save, and on
 * "confirm" the FormData waits for the confirm dialog's button.
 */
function useUserAction(action: Action, onSuccess?: () => void) {
  const [clientErrors, setClientErrors] = useState<FieldErrors | null>(null);
  const [awaiting, setAwaiting] = useState<FormData | null>(null);
  const [state, dispatch, pending] = useActionState(async (prev: UserActionState, fd: FormData) => {
    const result = await action(prev, fd);
    setAwaiting(null);
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

function Field({ label, error, hint, children, id }: { label: string; error?: string; hint?: string; children: ReactNode; id: string }) {
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
  ...props
}: { id: string; name: UserField; error?: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      id={id}
      name={name}
      aria-invalid={!!error}
      aria-describedby={`${id}-msg`}
      className={`${inputClass} ${error ? "border-stamp ring-2 ring-stamp/15" : "border-admin-line"}`}
      {...props}
    />
  );
}

function PasswordFields({ uid, errors, autoFocus = false }: { uid: string; errors: FieldErrors; autoFocus?: boolean }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <Field label="Password" id={`${uid}-pw`} error={errors.password} hint={`At least ${MIN_PASSWORD} characters`}>
        <TextInput id={`${uid}-pw`} name="password" error={errors.password} type="password" autoComplete="new-password" autoFocus={autoFocus} />
      </Field>
      <Field label="Confirm password" id={`${uid}-pw2`} error={errors.passwordConfirm}>
        <TextInput id={`${uid}-pw2`} name="passwordConfirm" error={errors.passwordConfirm} type="password" autoComplete="new-password" />
      </Field>
    </div>
  );
}

/* ---------- Main add/edit form ---------- */

function UserForm({ mode, onClose }: { mode: UserDrawerMode; onClose: () => void }) {
  const uid = useId();
  const editing = mode.kind === "edit" ? mode.user : null;
  const [notice, setNotice] = useState<string | null>(null);

  const form = useUserAction(editing ? updateUser : createUser, onClose);
  const { state, pending, errors } = form;

  function decide(fd: FormData): Decision {
    setNotice(null);
    const parsed = parseUserForm(fd, { withPassword: !editing });
    if (!parsed.ok) return { errors: parsed.errors };
    if (editing && parsed.data.name === editing.name && parsed.data.email === editing.email) {
      setNotice("No changes to save.");
      return { next: "stop" };
    }
    return { next: "run" };
  }

  return (
    <form onSubmit={(e) => form.handleSubmit(e, decide)} noValidate>
      {editing && <input type="hidden" name="id" value={editing.id} />}

      <Field label="Name" id={`${uid}-name`} error={errors.name}>
        <TextInput id={`${uid}-name`} name="name" error={errors.name} defaultValue={editing?.name} autoComplete="off" maxLength={60} autoFocus={!editing} />
      </Field>
      <Field label="Email" id={`${uid}-email`} error={errors.email} hint="Used to sign in">
        <TextInput id={`${uid}-email`} name="email" error={errors.email} type="email" defaultValue={editing?.email} autoComplete="off" />
      </Field>
      {!editing && <PasswordFields uid={uid} errors={errors} />}

      {!editing && (
        <p className="mb-3.5 rounded-lg border border-admin-line bg-[#fbfbfc] px-3.5 py-2.5 text-[12.5px] text-admin-subtle">
          They get full admin access, including this Users page. Share the password with them yourself. No email is sent.
        </p>
      )}

      {state.message && !state.errors?.email && (
        <p role="alert" className="mb-3 text-sm font-semibold text-stamp">{state.message}</p>
      )}
      {notice && <p role="status" className="mb-3 text-sm font-semibold text-admin-subtle">{notice}</p>}
      <div className="flex justify-end gap-2.5 border-t border-[#eef0f2] pt-3.5">
        <button type="button" onClick={onClose} className={secondaryBtn}>Cancel</button>
        <button type="submit" disabled={pending} className={primaryBtn}>
          {pending ? "Saving…" : editing ? "Save changes" : "Add user"}
        </button>
      </div>
    </form>
  );
}

/* ---------- Reset password (edit only) ---------- */

function PasswordBox({ user }: { user: UserRecord }) {
  const uid = useId();
  const [resetting, setResetting] = useState(false);
  const reset = useUserAction(resetUserPassword, () => setResetting(false));

  return (
    <section aria-label="Password" className="mb-5 rounded-lg border border-admin-line bg-[#fbfbfc] px-3.5 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] font-semibold text-admin-subtle">
          {user.disabled ? "Disabled: they can't sign in." : `Last sign in: ${user.lastSignIn}`}
        </p>
        {!resetting && (
          <button type="button" onClick={() => setResetting(true)} className={smallBtn}>Reset password</button>
        )}
      </div>
      {reset.state.ok && !resetting && <p role="status" className="mt-2 text-xs font-semibold text-ok">Password changed.</p>}

      {resetting && (
        <form
          onSubmit={(e) =>
            reset.handleSubmit(e, (fd) => {
              const parsed = parsePasswordForm(fd);
              return parsed.ok ? { next: "confirm" } : { errors: parsed.errors };
            })
          }
          noValidate
          className="mt-3 border-t border-admin-line pt-3"
        >
          <input type="hidden" name="id" value={user.id} />
          <PasswordFields uid={uid} errors={reset.errors} autoFocus />
          {reset.state.message && <p role="alert" className="mb-2 text-xs font-semibold text-stamp">{reset.state.message}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setResetting(false)} className={smallBtn}>Cancel</button>
            <button type="submit" disabled={reset.pending} className={smallPrimaryBtn}>
              {reset.pending ? "Saving…" : "Set password"}
            </button>
          </div>

          <ConfirmDialog
            {...reset.confirm}
            title={`Change ${user.name}'s password?`}
            description="Their old password stops working right away. Tell them the new one yourself."
            confirmLabel="Change password"
          />
        </form>
      )}
    </section>
  );
}

/* ---------- Disable / enable and delete (edit only, not on yourself) ---------- */

function AccessActions({ user, onDone }: { user: UserRecord; onDone: () => void }) {
  const toggle = useUserAction(setUserDisabled, onDone);
  const remove = useUserAction(deleteUser, onDone);
  const verb = user.disabled ? "Enable" : "Disable";
  const linkBtn = "rounded px-0 text-sm font-bold outline-none hover:underline focus-visible:ring-2 focus-visible:ring-admin-slate";

  return (
    <div className="mt-6 flex flex-wrap items-start gap-x-6 gap-y-3 border-t border-[#eef0f2] pt-4">
      <form onSubmit={(e) => toggle.handleSubmit(e, () => ({ next: "confirm" }))}>
        <input type="hidden" name="id" value={user.id} />
        <input type="hidden" name="disabled" value={String(!user.disabled)} />
        <button type="submit" className={`${linkBtn} ${user.disabled ? "text-admin-slate" : "text-stamp"}`}>
          {verb}
        </button>
        {toggle.state.message && <p role="alert" className="mt-2 text-xs font-semibold text-stamp">{toggle.state.message}</p>}
        <ConfirmDialog
          {...toggle.confirm}
          title={`${verb} ${user.name}?`}
          description={
            user.disabled
              ? "They'll be able to sign in again with their current password."
              : "They're signed out on their next click and can't sign in until you enable them again."
          }
          confirmLabel={verb}
          tone={user.disabled ? "default" : "danger"}
        />
      </form>

      <form onSubmit={(e) => remove.handleSubmit(e, () => ({ next: "confirm" }))}>
        <input type="hidden" name="id" value={user.id} />
        <button type="submit" className={`${linkBtn} text-stamp`}>Delete user</button>
        {remove.state.message && <p role="alert" className="mt-2 text-xs font-semibold text-stamp">{remove.state.message}</p>}
        <ConfirmDialog
          {...remove.confirm}
          title={`Delete ${user.name}?`}
          description="Their login is removed for good. Staff and punch records aren't affected. You can add them again later."
          confirmLabel="Delete user"
          tone="danger"
        />
      </form>
    </div>
  );
}

/* ---------- Drawer content (rendered inside UsersTable's <Sheet>) ---------- */

export function UserDrawer({ mode, selfId, onClose }: { mode: UserDrawerMode; selfId: string; onClose: () => void }) {
  const title = mode.kind === "edit" ? `Edit ${mode.user.name}` : "Add user";
  const isSelf = mode.kind === "edit" && mode.user.id === selfId;

  return (
    <SheetContent
      side="right"
      className="gap-0 overflow-y-auto bg-white p-0 font-admin text-admin-slate shadow-[-12px_0_32px_rgba(30,40,51,0.12)] data-[side=right]:w-full data-[side=right]:sm:max-w-md"
    >
      <SheetHeader className="px-5 pt-5 pb-5 sm:px-6">
        <SheetTitle className="text-lg font-extrabold tracking-tight">{title}</SheetTitle>
      </SheetHeader>
      <div className="flex flex-1 flex-col px-5 pb-6 sm:px-6">
        {mode.kind === "edit" && <PasswordBox user={mode.user} />}
        <UserForm mode={mode} onClose={onClose} />
        {mode.kind === "edit" && !isSelf && <AccessActions user={mode.user} onDone={onClose} />}
        {isSelf && (
          <p className="mt-6 border-t border-[#eef0f2] pt-4 text-xs text-admin-subtle">
            You can&apos;t disable or delete your own account.
          </p>
        )}
      </div>
    </SheetContent>
  );
}
