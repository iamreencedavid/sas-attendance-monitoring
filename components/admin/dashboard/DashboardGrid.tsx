"use client";

import { useMemo, useState } from "react";
import { Sheet } from "@/components/ui/sheet";
import type { TodayBoard, TodayStatus } from "@/lib/dashboard/types";
import { StaffCard } from "./StaffCard";
import { STATUS_LABELS, STATUS_ORDER } from "./status";
import { TodayDrawer } from "./TodayDrawer";

type Filter = "all" | TodayStatus;

export function DashboardGrid({ board }: { board: TodayBoard }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [open, setOpen] = useState<string | null>(null);
  // What the drawer last showed, kept while it animates closed.
  const [shownId, setShownId] = useState<string | null>(null);

  function openDrawer(id: string) {
    setOpen(id);
    setShownId(id);
  }

  const counts = useMemo(() => {
    const byStatus = Object.fromEntries(STATUS_ORDER.map((s) => [s, 0])) as Record<TodayStatus, number>;
    for (const s of board.staff) byStatus[s.status]++;
    return byStatus;
  }, [board.staff]);

  const filters: { key: Filter; label: string }[] = [
    { key: "all", label: `All ${board.staff.length}` },
    // Missing OUT and Day off only show up when someone has that status.
    ...STATUS_ORDER.filter((s) => (s !== "missing_out" && s !== "day_off") || counts[s] > 0).map((s) => ({
      key: s,
      label: `${STATUS_LABELS[s]} ${counts[s]}`,
    })),
  ];

  const cards = filter === "all" ? board.staff : board.staff.filter((s) => s.status === filter);
  const shown = board.staff.find((s) => s.id === shownId);

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-4">
        <h1 className="text-2xl font-extrabold tracking-tight">Dashboard</h1>
        <p className="mt-0.5 text-sm text-admin-subtle tabular-nums">
          {board.dateLabel} · {board.time}
        </p>
      </div>

      <div
        role="group"
        aria-label="Show"
        className="mb-4 flex w-fit max-w-full flex-wrap rounded-[7px] bg-admin-mist p-[3px] text-[13px] font-semibold"
      >
        {filters.map((f) => (
          <button
            key={f.key}
            type="button"
            aria-pressed={filter === f.key}
            onClick={() => setFilter(f.key)}
            className={`rounded-[5px] px-3 py-1.5 tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-admin-slate ${
              filter === f.key ? "bg-white text-admin-slate shadow-sm" : "text-admin-subtle"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {cards.length === 0 ? (
        <p className="rounded-[10px] border border-admin-line bg-white px-4 py-10 text-center text-sm text-admin-subtle">
          {board.staff.length === 0 ? "No active staff yet. Add people on the Staff page." : "No one here right now."}
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-3 xl:grid-cols-4">
          {cards.map((s) => (
            <li key={s.id} className="flex">
              <StaffCard staff={s} selected={open === s.id} onOpen={() => openDrawer(s.id)} />
            </li>
          ))}
        </ul>
      )}

      <Sheet open={open !== null} onOpenChange={(isOpen) => !isOpen && setOpen(null)}>
        {shown && <TodayDrawer staff={shown} />}
      </Sheet>
    </div>
  );
}
