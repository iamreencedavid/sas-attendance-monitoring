"use client";

import { CheckCircle2Icon, TabletSmartphoneIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { Sheet } from "@/components/ui/sheet";
import type { DeviceRecord, ThisBrowser } from "@/lib/devices/types";
import { DeviceDrawer } from "./DeviceDrawer";

type Filter = "all" | "active" | "revoked";
type DrawerTarget = null | "register" | string;

const primaryBtn =
  "flex-none rounded-md bg-admin-slate px-3.5 py-2 text-sm font-bold text-white outline-none hover:bg-admin-slate/90 focus-visible:ring-2 focus-visible:ring-admin-slate focus-visible:ring-offset-2";

function Status({ device }: { device: DeviceRecord }) {
  return device.revoked ? (
    <span className="text-[13px] font-bold text-admin-subtle">Revoked</span>
  ) : (
    <span className="text-[13px] font-bold text-ok">Active</span>
  );
}

function ThisBrowserTag({ device }: { device: DeviceRecord }) {
  return device.isThisBrowser ? (
    <span className="ml-2 inline-block rounded-[5px] bg-roast-dark px-2 py-0.5 align-middle text-xs font-bold text-roast-dark-ink">
      This browser
    </span>
  ) : null;
}

/** Top banner: whether the browser you're looking from can punch. */
function BrowserBanner({ browser, current, onRegister }: { browser: ThisBrowser; current?: DeviceRecord; onRegister: () => void }) {
  const what = `${browser.browserLabel} on ${browser.deviceLabel}`;
  if (current) {
    return (
      <section aria-label="This browser" className="mb-4 flex items-center gap-3 rounded-[10px] border border-admin-line bg-white px-4 py-3.5">
        <CheckCircle2Icon aria-hidden="true" className="size-5 flex-none text-ok" />
        <div className="min-w-0">
          <p className="text-sm font-extrabold">This browser is registered as &ldquo;{current.name}&rdquo;</p>
          <p className="mt-0.5 text-[13px] text-admin-subtle">{what}. Staff can punch here.</p>
        </div>
      </section>
    );
  }
  return (
    <section
      aria-label="This browser"
      className="mb-4 flex flex-col gap-3 rounded-[10px] bg-roast-light px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex items-center gap-3">
        <TabletSmartphoneIcon aria-hidden="true" className="size-5 flex-none text-roast-light-ink" />
        <div className="min-w-0">
          <p className="text-sm font-extrabold text-roast-medium-ink">This browser isn&apos;t registered</p>
          <p className="mt-0.5 text-[13px] text-roast-light-ink">{what}. Register it to let staff punch here.</p>
        </div>
      </div>
      <button type="button" onClick={onRegister} className={primaryBtn}>
        Register this browser
      </button>
    </section>
  );
}

export function DevicesTable({ devices, browser }: { devices: DeviceRecord[]; browser: ThisBrowser }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [drawer, setDrawer] = useState<DrawerTarget>(null);
  // What the drawer last showed, kept while it animates closed.
  const [shown, setShown] = useState<{ target: "register" | string; key: number }>({ target: "register", key: 0 });

  function openDrawer(target: "register" | string) {
    setDrawer(target);
    setShown((prev) => ({ target, key: prev.key + 1 }));
  }

  const counts = useMemo(() => {
    const revoked = devices.filter((d) => d.revoked).length;
    return { all: devices.length, active: devices.length - revoked, revoked };
  }, [devices]);

  const rows = devices.filter((d) => (filter === "active" ? !d.revoked : filter === "revoked" ? d.revoked : true));
  const current = devices.find((d) => d.isThisBrowser);
  // Look the record up from fresh props so the drawer shows saved changes.
  const viewing = shown.target !== "register" ? devices.find((d) => d.id === shown.target) : undefined;

  const filters: { key: Filter; label: string }[] = [
    { key: "all", label: `All ${counts.all}` },
    { key: "active", label: `Active ${counts.active}` },
    { key: "revoked", label: `Revoked ${counts.revoked}` },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-4">
        <h1 className="text-2xl font-extrabold tracking-tight">Devices</h1>
        <p className="mt-0.5 text-[13px] text-admin-subtle">Browsers allowed to open the punch page.</p>
      </div>

      <BrowserBanner browser={browser} current={current} onRegister={() => openDrawer("register")} />

      <div role="group" aria-label="Show" className="mb-3 flex w-fit rounded-[7px] bg-admin-mist p-[3px] text-[13px] font-semibold">
        {filters.map((f) => (
          <button
            key={f.key}
            type="button"
            aria-pressed={filter === f.key}
            onClick={() => setFilter(f.key)}
            className={`rounded-[5px] px-3 py-1.5 outline-none focus-visible:ring-2 focus-visible:ring-admin-slate ${
              filter === f.key ? "bg-white text-admin-slate shadow-sm" : "text-admin-subtle"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <p className="rounded-[10px] border border-admin-line bg-white px-4 py-10 text-center text-sm text-admin-subtle">
          {devices.length === 0 ? "No devices yet. Open this page on the shop tablet and register it." : "No devices here."}
        </p>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-[10px] border border-admin-line bg-white md:block">
            <table className="w-full border-collapse text-[13.5px]">
              <thead>
                <tr className="bg-[#fbfbfc] text-left text-xs font-bold text-admin-subtle">
                  <th className="px-3.5 py-2.5 font-bold">Name</th>
                  <th className="px-3.5 py-2.5 font-bold">Detected device</th>
                  <th className="px-3.5 py-2.5 font-bold">Status</th>
                  <th className="px-3.5 py-2.5 font-bold">Registered</th>
                  <th className="px-3.5 py-2.5 font-bold">Last used</th>
                  <th className="px-3.5 py-2.5"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((d) => (
                  <tr
                    key={d.id}
                    className={`border-t border-[#eef0f2] align-top tabular-nums ${d.revoked ? "text-admin-subtle" : ""} ${drawer === d.id ? "bg-admin-mist" : ""}`}
                  >
                    <td className="px-3.5 py-3 font-bold">
                      {d.name}
                      <ThisBrowserTag device={d} />
                    </td>
                    <td className="px-3.5 py-3">
                      {d.deviceLabel}
                      <span className="block text-xs text-admin-subtle">{d.browserLabel}</span>
                    </td>
                    <td className="px-3.5 py-3"><Status device={d} /></td>
                    <td className="px-3.5 py-3">
                      {d.registeredAt}
                      {d.registeredBy && <span className="block text-xs text-admin-subtle">by {d.registeredBy}</span>}
                    </td>
                    <td className="px-3.5 py-3">
                      {d.lastUsed}
                      {d.lastCity && <span className="block text-xs text-admin-subtle">{d.lastCity}</span>}
                    </td>
                    <td className="px-3.5 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => openDrawer(d.id)}
                        className="rounded px-1 text-[13px] font-bold text-admin-slate underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-admin-slate"
                      >
                        {d.revoked ? "View" : "Edit"}<span className="sr-only"> {d.name}</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Phone list */}
          <ul className="space-y-2 md:hidden">
            {rows.map((d) => (
              <li key={d.id}>
                <button
                  type="button"
                  onClick={() => openDrawer(d.id)}
                  className={`block w-full rounded-[10px] border border-admin-line bg-white p-3.5 text-left tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-admin-slate ${d.revoked ? "text-admin-subtle" : ""}`}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="min-w-0 truncate font-bold">
                      {d.name}
                      <ThisBrowserTag device={d} />
                    </span>
                    <Status device={d} />
                  </span>
                  <span className="mt-1 block truncate text-[13px]">{d.deviceLabel} · {d.browserLabel}</span>
                  <span className="mt-1.5 block text-[13px] text-admin-subtle">Last used {d.lastUsed}</span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      <Sheet open={drawer !== null} onOpenChange={(open) => !open && setDrawer(null)}>
        {shown.target === "register" ? (
          <DeviceDrawer key={shown.key} mode={{ kind: "register", browser }} onClose={() => setDrawer(null)} />
        ) : (
          viewing && <DeviceDrawer key={shown.key} mode={{ kind: "details", device: viewing }} onClose={() => setDrawer(null)} />
        )}
      </Sheet>
    </div>
  );
}
