"use client";

import { useMemo, useState } from "react";
import { formatPeso } from "@/lib/staff/pay";
import { shiftHours } from "@/lib/staff/shift";
import type { StaffRecord } from "@/lib/staff/types";
import { PinMeter } from "./PinMeter";
import { RoleChip } from "./RoleChip";
import { Sheet } from "@/components/ui/sheet";
import { StaffDrawer } from "./StaffDrawer";

type Filter = "all" | "active" | "inactive";
type DrawerTarget = null | "new" | string;

function Status({ staff }: { staff: StaffRecord }) {
  if (!staff.active) return <span className="text-[13px] font-bold text-admin-subtle">Inactive</span>;
  if (staff.lockMinutesLeft) {
    return <span className="text-[13px] font-bold text-stamp">Locked {staff.lockMinutesLeft} min</span>;
  }
  return <span className="text-[13px] font-bold text-ok">Active</span>;
}

function Peso({ amount }: { amount: number | null }) {
  return amount === null ? <span className="text-admin-subtle">Not set</span> : <>{formatPeso(amount)}</>;
}

export function StaffTable({ staff }: { staff: StaffRecord[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [drawer, setDrawer] = useState<DrawerTarget>(null);
  // What the drawer last showed, kept while it animates closed.
  const [shown, setShown] = useState<{ target: "new" | string; key: number }>({ target: "new", key: 0 });

  function openDrawer(target: "new" | string) {
    setDrawer(target);
    setShown((prev) => ({ target, key: prev.key + 1 }));
  }

  const counts = useMemo(() => {
    const active = staff.filter((s) => s.active).length;
    return { all: staff.length, active, inactive: staff.length - active };
  }, [staff]);

  const rows = staff.filter((s) => {
    if (filter === "active" && !s.active) return false;
    if (filter === "inactive" && s.active) return false;
    return s.name.toLowerCase().includes(query.trim().toLowerCase());
  });

  // Look the record up from fresh props so the drawer shows saved changes.
  const editing = shown.target !== "new" ? staff.find((s) => s.id === shown.target) : undefined;

  const filters: { key: Filter; label: string }[] = [
    { key: "all", label: `All ${counts.all}` },
    { key: "active", label: `Active ${counts.active}` },
    { key: "inactive", label: `Inactive ${counts.inactive}` },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold tracking-tight">Staff</h1>
        <button
          type="button"
          onClick={() => openDrawer("new")}
          className="rounded-md bg-admin-slate px-3.5 py-2 text-sm font-bold text-white outline-none hover:bg-admin-slate/90 focus-visible:ring-2 focus-visible:ring-admin-slate focus-visible:ring-offset-2"
        >
          Add staff
        </button>
      </div>

      <div className="mb-3 flex flex-col gap-2.5 sm:flex-row sm:items-center">
        <div role="group" aria-label="Show" className="flex w-fit rounded-[7px] bg-admin-mist p-[3px] text-[13px] font-semibold">
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
        <label className="sm:w-64">
          <span className="sr-only">Search by name</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name"
            className="w-full rounded-[7px] border border-admin-line bg-white px-3 py-2 text-[13px] outline-none placeholder:text-admin-subtle focus-visible:border-admin-slate focus-visible:ring-2 focus-visible:ring-admin-slate/20"
          />
        </label>
        <ul aria-label="Role colours" className="hidden gap-3 text-xs text-admin-subtle lg:ml-auto lg:flex">
          <li className="flex items-center gap-1.5"><i className="size-2.5 rounded-[3px] bg-roast-light" />Barista</li>
          <li className="flex items-center gap-1.5"><i className="size-2.5 rounded-[3px] bg-roast-medium" />Kitchen</li>
          <li className="flex items-center gap-1.5"><i className="size-2.5 rounded-[3px] bg-roast-dark" />Supervisor</li>
        </ul>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-[10px] border border-admin-line bg-white px-4 py-10 text-center text-sm text-admin-subtle">
          {staff.length === 0
            ? "No staff yet. Add your first person to get started."
            : query.trim()
              ? `No one matches "${query.trim()}".`
              : "No one here."}
        </p>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-[10px] border border-admin-line bg-white md:block">
            <table className="w-full border-collapse text-[13.5px]">
              <thead>
                <tr className="bg-[#fbfbfc] text-left text-xs font-bold text-admin-subtle">
                  <th className="px-3.5 py-2.5 font-bold">Name</th>
                  <th className="px-3.5 py-2.5 font-bold">Role</th>
                  <th className="px-3.5 py-2.5 font-bold">Shift</th>
                  <th className="px-3.5 py-2.5 font-bold">Hours</th>
                  <th className="px-3.5 py-2.5 text-right font-bold">Daily rate</th>
                  <th className="px-3.5 py-2.5 text-right font-bold">OT / hr</th>
                  <th className="px-3.5 py-2.5 font-bold">Wrong PINs</th>
                  <th className="px-3.5 py-2.5 font-bold">Status</th>
                  <th className="px-3.5 py-2.5"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((s) => (
                  <tr
                    key={s.id}
                    className={`border-t border-[#eef0f2] tabular-nums ${s.active ? "" : "text-admin-subtle"} ${drawer === s.id ? "bg-admin-mist" : ""}`}
                  >
                    <td className="px-3.5 py-3 font-bold">{s.name}</td>
                    <td className="px-3.5 py-3"><RoleChip role={s.role} muted={!s.active} /></td>
                    <td className="px-3.5 py-3">{s.shiftStart}–{s.shiftEnd}</td>
                    <td className="px-3.5 py-3">{shiftHours(s.shiftStart, s.shiftEnd)}</td>
                    <td className="px-3.5 py-3 text-right"><Peso amount={s.dailyRate} /></td>
                    <td className="px-3.5 py-3 text-right"><Peso amount={s.overtimeRate} /></td>
                    <td className="px-3.5 py-3"><PinMeter failed={s.failedPinCount} locked={!!s.lockMinutesLeft} /></td>
                    <td className="px-3.5 py-3"><Status staff={s} /></td>
                    <td className="px-3.5 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => openDrawer(s.id)}
                        className="rounded px-1 text-[13px] font-bold text-admin-slate underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-admin-slate"
                      >
                        {s.lockMinutesLeft ? "Unlock" : "Edit"}<span className="sr-only"> {s.name}</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Phone list */}
          <ul className="space-y-2 md:hidden">
            {rows.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => openDrawer(s.id)}
                  className={`w-full rounded-[10px] border border-admin-line bg-white p-3.5 text-left tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-admin-slate ${s.active ? "" : "text-admin-subtle"}`}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="font-bold">{s.name}</span>
                    <Status staff={s} />
                  </span>
                  <span className="mt-2 flex items-center gap-3 text-[13px]">
                    <RoleChip role={s.role} muted={!s.active} />
                    <span>{s.shiftStart}–{s.shiftEnd}</span>
                    <span className="ml-auto"><PinMeter failed={s.failedPinCount} locked={!!s.lockMinutesLeft} /></span>
                  </span>
                  <span className="mt-1.5 block text-[13px] text-admin-subtle">
                    {s.dailyRate === null && s.overtimeRate === null
                      ? "Pay not set"
                      : `${formatPeso(s.dailyRate)}/day · ${formatPeso(s.overtimeRate)}/hr OT`}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      <Sheet open={drawer !== null} onOpenChange={(open) => !open && setDrawer(null)}>
        {shown.target === "new" ? (
          <StaffDrawer key={shown.key} mode={{ kind: "new" }} onClose={() => setDrawer(null)} />
        ) : (
          editing && (
            <StaffDrawer key={shown.key} mode={{ kind: "edit", staff: editing }} onClose={() => setDrawer(null)} />
          )
        )}
      </Sheet>
    </div>
  );
}
