"use client";

import { startTransition, useActionState, useId, useState, type FormEvent } from "react";
import { saveSettings } from "@/lib/settings/actions";
import { GRACE_MAX_MINUTES, type AppSettings, type SettingsActionState } from "@/lib/settings/types";

const INITIAL: SettingsActionState = { ok: false };

const inputClass =
  "w-28 min-w-0 rounded-[7px] border bg-white px-3 py-2 text-[15px] font-bold outline-none focus-visible:border-admin-slate focus-visible:ring-2 focus-visible:ring-admin-slate/20";
const primaryBtn =
  "min-h-10 rounded-md bg-admin-slate px-4 py-2 text-sm font-bold text-white outline-none hover:bg-admin-slate/90 focus-visible:ring-2 focus-visible:ring-admin-slate focus-visible:ring-offset-2 disabled:opacity-60 max-sm:min-h-11";
const secondaryBtn =
  "min-h-10 rounded-md border border-admin-line bg-white px-4 py-2 text-sm font-bold text-admin-slate outline-none hover:bg-admin-mist focus-visible:ring-2 focus-visible:ring-admin-slate disabled:opacity-60 max-sm:min-h-11";

export function SettingsForm({ settings }: { settings: AppSettings }) {
  const uid = useId();
  const saved = String(settings.graceMinutes);
  const [grace, setGrace] = useState(saved);
  const [state, dispatch, pending] = useActionState(saveSettings, INITIAL);
  const dirty = grace !== saved;
  const graceError = state.errors?.graceMinutes;

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(() => dispatch(fd));
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight">Settings</h1>
        <p className="mt-0.5 text-[13px] text-admin-subtle">Shop-wide rules for attendance and pay.</p>
      </div>

      <section aria-labelledby={`${uid}-attendance`} className="flex flex-col gap-3 md:flex-row md:items-start md:gap-8">
        <div className="md:w-56 md:flex-none">
          <h2 id={`${uid}-attendance`} className="text-[15px] font-extrabold">Attendance</h2>
          <p className="mt-1 text-[12.5px] leading-relaxed text-admin-subtle">
            How punches are judged on the Dashboard, Monitoring and Payroll.
          </p>
        </div>
        <div className="flex-1 rounded-xl border border-admin-line bg-white px-4 py-[18px] md:max-w-[520px] md:px-6 md:py-[22px]">
          <label htmlFor={`${uid}-grace`} className="mb-1.5 block text-[12.5px] font-bold">
            Grace period
          </label>
          <div className="flex items-center gap-2.5">
            <input
              id={`${uid}-grace`}
              name="graceMinutes"
              type="number"
              inputMode="numeric"
              min={0}
              max={GRACE_MAX_MINUTES}
              step={1}
              value={grace}
              onChange={(e) => setGrace(e.target.value)}
              aria-invalid={graceError ? true : undefined}
              aria-describedby={`${uid}-grace-msg`}
              className={`${inputClass} ${graceError ? "border-stamp ring-2 ring-stamp/15" : "border-admin-line"}`}
            />
            <span className="text-sm text-admin-subtle">minutes</span>
          </div>
          <p
            id={`${uid}-grace-msg`}
            className={`mt-2 text-[12.5px] leading-relaxed ${graceError ? "font-semibold text-stamp" : "text-admin-subtle"}`}
          >
            {graceError ??
              `Staff who punch IN within this many minutes after their shift starts aren’t marked late. 0 means no grace. Max ${GRACE_MAX_MINUTES}.`}
          </p>
        </div>
      </section>

      <div className="flex flex-col gap-2.5 border-t border-admin-line pt-3.5 sm:flex-row sm:items-center sm:justify-between">
        <p role="status" className="text-xs">
          {state.message ? (
            <span className="font-semibold text-stamp">{state.message}</span>
          ) : state.ok && !dirty ? (
            <span className="font-semibold text-ok">Saved.</span>
          ) : settings.updatedAt ? (
            <span className="text-admin-subtle">
              Last changed by {settings.updatedBy ?? "an admin"} · {settings.updatedAt}
            </span>
          ) : (
            <span className="text-admin-subtle">Not changed yet.</span>
          )}
        </p>
        <div className="flex flex-col gap-2.5 sm:flex-row">
          <button type="button" disabled={!dirty || pending} onClick={() => setGrace(saved)} className={secondaryBtn}>
            Discard changes
          </button>
          <button type="submit" disabled={pending} className={primaryBtn}>
            {pending ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </form>
  );
}
