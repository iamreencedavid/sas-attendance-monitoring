"use client";

import { startTransition, useActionState, useEffect, useId, useState, type FormEvent, type ReactNode } from "react";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { registerThisBrowser, renameDevice, revokeDevice } from "@/lib/devices/actions";
import type { DeviceActionState, DeviceRecord, ThisBrowser } from "@/lib/devices/types";

export type DeviceDrawerMode = { kind: "register"; browser: ThisBrowser } | { kind: "details"; device: DeviceRecord };
type Action = (prev: DeviceActionState, formData: FormData) => Promise<DeviceActionState>;

const INITIAL: DeviceActionState = { ok: false };

const inputClass =
  "w-full min-w-0 rounded-[7px] border bg-white px-3 py-2 text-sm outline-none focus-visible:border-admin-slate focus-visible:ring-2 focus-visible:ring-admin-slate/20";
const primaryBtn =
  "flex-none rounded-md bg-admin-slate px-3.5 py-2 text-sm font-bold text-white outline-none hover:bg-admin-slate/90 focus-visible:ring-2 focus-visible:ring-admin-slate focus-visible:ring-offset-2 disabled:opacity-60";
const secondaryBtn =
  "rounded-md border border-admin-line bg-white px-3.5 py-2 text-sm font-bold text-admin-slate outline-none hover:bg-admin-mist focus-visible:ring-2 focus-visible:ring-admin-slate disabled:opacity-60";

/** Chromium's User-Agent Client Hints; not in TypeScript's DOM types yet. */
type UADataNavigator = Navigator & {
  userAgentData?: { getHighEntropyValues(hints: string[]): Promise<{ model?: string }> };
};

/** Model (Chromium on Android only) and screen size, read in the browser. */
function useDetected() {
  const [detected, setDetected] = useState<{ model: string; screen: string }>({ model: "", screen: "" });
  useEffect(() => {
    let cancelled = false;
    const screenSize = `${window.screen.width} × ${window.screen.height}`;
    const uaData = (navigator as UADataNavigator).userAgentData;
    const model = uaData ? uaData.getHighEntropyValues(["model"]).then((v) => v.model ?? "", () => "") : Promise.resolve("");
    model.then((m) => !cancelled && setDetected({ model: m.trim(), screen: screenSize }));
    return () => {
      cancelled = true;
    };
  }, []);
  return detected;
}

/** Server Action wrapper: optional confirm step, closes the drawer on success. */
function useDeviceAction(action: Action, onSuccess?: () => void) {
  const [awaiting, setAwaiting] = useState<FormData | null>(null);
  const [state, dispatch, pending] = useActionState(async (prev: DeviceActionState, fd: FormData) => {
    const result = await action(prev, fd);
    setAwaiting(null);
    if (result.ok) onSuccess?.();
    return result;
  }, INITIAL);

  function submit(e: FormEvent<HTMLFormElement>, confirmFirst = false) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    if (confirmFirst) setAwaiting(fd);
    else startTransition(() => dispatch(fd));
  }

  return {
    state,
    pending,
    submit,
    confirm: {
      open: awaiting !== null,
      onOpenChange: (open: boolean) => !open && setAwaiting(null),
      onConfirm: () => awaiting && startTransition(() => dispatch(awaiting)),
      pending,
    },
  };
}

function Details({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <dl className="grid grid-cols-[110px_1fr] gap-y-2 text-[13px]">
      {rows.map(([label, value]) => (
        <div key={label} className="contents">
          <dt className="text-admin-subtle">{label}</dt>
          <dd className="min-w-0 font-bold break-words">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

/* ---------- Register this browser ---------- */

function RegisterForm({ browser, onClose }: { browser: ThisBrowser; onClose: () => void }) {
  const uid = useId();
  const detected = useDetected();
  const form = useDeviceAction(registerThisBrowser, onClose);
  const nameError = form.state.errors?.name;
  const device = detected.model ? `${browser.deviceLabel} · ${detected.model}` : browser.deviceLabel;
  const network = [browser.ip, browser.city].filter(Boolean).join(" · ") || "Not available";

  return (
    <form onSubmit={(e) => form.submit(e)} noValidate className="flex flex-1 flex-col">
      <input type="hidden" name="model" value={detected.model} />
      <input type="hidden" name="screen" value={detected.screen} />

      <div className="mb-3.5">
        <label htmlFor={`${uid}-name`} className="mb-1.5 block text-[12.5px] font-bold">Device name</label>
        <input
          id={`${uid}-name`}
          name="name"
          defaultValue="Counter tablet"
          maxLength={60}
          autoComplete="off"
          autoFocus
          aria-invalid={!!nameError}
          aria-describedby={`${uid}-name-msg`}
          className={`${inputClass} ${nameError ? "border-stamp ring-2 ring-stamp/15" : "border-admin-line"}`}
        />
        <p id={`${uid}-name-msg`} className={`mt-1.5 text-xs ${nameError ? "font-semibold text-stamp" : "text-admin-subtle"}`}>
          {nameError ?? "Pick a name you'll recognise. It shows on this list and on every punch made here."}
        </p>
      </div>

      <section aria-label="Detected" className="mb-3.5 rounded-lg border border-admin-line bg-[#fbfbfc] px-3.5 py-3">
        <p className="mb-2.5 text-xs font-bold tracking-wide text-admin-subtle uppercase">Detected automatically</p>
        <Details
          rows={[
            ["Device", device],
            ["Browser", browser.browserLabel],
            ["Screen", detected.screen || "…"],
            ["Network", network],
          ]}
        />
      </section>

      <p className="rounded-lg bg-roast-light px-3.5 py-2.5 text-[12.5px] leading-relaxed text-roast-medium-ink">
        Registration is saved in <strong>this browser only</strong>. Another browser on the same tablet, a private
        window, or clearing the browser&apos;s site data will need a new registration.
      </p>

      {form.state.message && <p role="alert" className="mt-3 text-sm font-semibold text-stamp">{form.state.message}</p>}
      <div className="mt-auto flex justify-end gap-2.5 border-t border-[#eef0f2] pt-3.5">
        <button type="button" onClick={onClose} className={secondaryBtn}>Cancel</button>
        <button type="submit" disabled={form.pending} className={primaryBtn}>
          {form.pending ? "Registering…" : "Register"}
        </button>
      </div>
    </form>
  );
}

/* ---------- Details: rename and revoke ---------- */

function DeviceDetails({ device, onClose }: { device: DeviceRecord; onClose: () => void }) {
  const uid = useId();
  const rename = useDeviceAction(renameDevice);
  const revoke = useDeviceAction(revokeDevice, onClose);
  const nameError = rename.state.errors?.name;
  const lastUsedWhere = [device.lastIp, device.lastCity].filter(Boolean).join(" · ");

  return (
    <div className="flex flex-1 flex-col">
      <div className="mb-5 flex items-center gap-2">
        {device.isThisBrowser && (
          <span className="rounded-[5px] bg-roast-dark px-2 py-0.5 text-xs font-bold text-roast-dark-ink">This browser</span>
        )}
        <span className={`text-[13px] font-bold ${device.revoked ? "text-admin-subtle" : "text-ok"}`}>
          {device.revoked ? "Revoked" : "Active"}
        </span>
      </div>

      {!device.revoked && (
        <form onSubmit={(e) => rename.submit(e)} noValidate className="mb-5">
          <input type="hidden" name="id" value={device.id} />
          <label htmlFor={`${uid}-name`} className="mb-1.5 block text-[12.5px] font-bold">Device name</label>
          <div className="flex gap-2">
            <input
              id={`${uid}-name`}
              name="name"
              defaultValue={device.name}
              maxLength={60}
              autoComplete="off"
              aria-invalid={!!nameError}
              aria-describedby={`${uid}-name-msg`}
              className={`${inputClass} ${nameError ? "border-stamp ring-2 ring-stamp/15" : "border-admin-line"}`}
            />
            <button type="submit" disabled={rename.pending} className={primaryBtn}>
              {rename.pending ? "Saving…" : "Save"}
            </button>
          </div>
          <p id={`${uid}-name-msg`} role="status" className="mt-1.5 text-xs font-semibold">
            {nameError ? (
              <span className="text-stamp">{nameError}</span>
            ) : rename.state.message ? (
              <span className="text-stamp">{rename.state.message}</span>
            ) : rename.state.ok ? (
              <span className="text-ok">Name saved.</span>
            ) : null}
          </p>
        </form>
      )}

      <Details
        rows={[
          ["Device", device.deviceLabel],
          ["Browser", device.browserLabel],
          ...(device.screen ? [["Screen", device.screen] as [string, string]] : []),
          [
            "Registered",
            <>
              {device.registeredAt}
              {device.registeredBy && <span className="block font-medium text-admin-subtle">by {device.registeredBy}</span>}
            </>,
          ],
          [
            "Last used",
            <>
              {device.lastUsed}
              {lastUsedWhere && <span className="block font-medium text-admin-subtle">{lastUsedWhere}</span>}
            </>,
          ],
          ["Punches", `${device.punchCount} since registered`],
          ...(device.revokedAt
            ? [
                [
                  "Revoked",
                  <>
                    {device.revokedAt}
                    {device.revokedBy && <span className="block font-medium text-admin-subtle">by {device.revokedBy}</span>}
                  </>,
                ] as [string, ReactNode],
              ]
            : []),
        ]}
      />

      {device.revoked ? (
        <p className="mt-auto border-t border-[#eef0f2] pt-4 text-xs leading-relaxed text-admin-subtle">
          Revoked devices stay listed for history. To use this browser again, register it as a new device.
        </p>
      ) : (
        <form onSubmit={(e) => revoke.submit(e, true)} className="mt-auto border-t border-[#eef0f2] pt-4">
          <input type="hidden" name="id" value={device.id} />
          <button
            type="submit"
            className="rounded px-0 text-sm font-bold text-stamp outline-none hover:underline focus-visible:ring-2 focus-visible:ring-admin-slate"
          >
            Revoke device
          </button>
          <p className="mt-1.5 text-xs leading-relaxed text-admin-subtle">
            This browser stops opening the punch page right away. Its past punches are kept. To use it again, register it
            as a new device.
          </p>
          {revoke.state.message && <p role="alert" className="mt-2 text-xs font-semibold text-stamp">{revoke.state.message}</p>}
          <ConfirmDialog
            {...revoke.confirm}
            title={`Revoke ${device.name}?`}
            description={
              device.isThisBrowser
                ? "This is the browser you're using. It stops opening the punch page right away. This can't be undone."
                : "Staff can't punch on it from its next request. Its past punches are kept. This can't be undone."
            }
            confirmLabel="Revoke device"
            tone="danger"
          />
        </form>
      )}
    </div>
  );
}

/* ---------- Drawer content (rendered inside DevicesTable's <Sheet>) ---------- */

export function DeviceDrawer({ mode, onClose }: { mode: DeviceDrawerMode; onClose: () => void }) {
  const title = mode.kind === "register" ? "Register this browser" : mode.device.name;

  return (
    <SheetContent
      side="right"
      className="gap-0 overflow-y-auto bg-white p-0 font-admin text-admin-slate shadow-[-12px_0_32px_rgba(30,40,51,0.12)] data-[side=right]:w-full data-[side=right]:sm:max-w-md"
    >
      <SheetHeader className="px-5 pt-5 pb-5 sm:px-6">
        <SheetTitle className="text-lg font-extrabold tracking-tight">{title}</SheetTitle>
      </SheetHeader>
      <div className="flex flex-1 flex-col px-5 pb-6 sm:px-6">
        {mode.kind === "register" ? (
          <RegisterForm browser={mode.browser} onClose={onClose} />
        ) : (
          <DeviceDetails device={mode.device} onClose={onClose} />
        )}
      </div>
    </SheetContent>
  );
}
