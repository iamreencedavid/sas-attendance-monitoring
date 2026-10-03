"use client";

import { PlusIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { Sheet } from "@/components/ui/sheet";
import type { AddShiftStaff, MonitoringFilters } from "@/lib/monitoring/types";
import { AddShiftDrawer } from "./AddShiftDrawer";
import { primaryBtn } from "./fields";

export function AddShiftButton({
  staff,
  filters,
  today,
}: {
  staff: AddShiftStaff[];
  filters: MonitoringFilters;
  today: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  // Bumped on every open so the form starts empty.
  const [n, setN] = useState(0);

  const onClose = useCallback(() => setOpen(false), []);
  const onAdded = useCallback(
    (added: { staffId: string; dateKey: string }) => {
      setOpen(false);
      // Show the new row when the current filters would hide it.
      const hidden =
        added.dateKey < filters.from || added.dateKey > filters.to || (filters.staffId && filters.staffId !== added.staffId);
      if (hidden) {
        const params = new URLSearchParams({ staff: added.staffId, from: added.dateKey, to: added.dateKey });
        router.push(`/admin/monitoring?${params}`);
      }
    },
    [filters, router],
  );

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setN((prev) => prev + 1);
          setOpen(true);
        }}
        className={`${primaryBtn} inline-flex items-center gap-1.5`}
      >
        <PlusIcon aria-hidden="true" className="size-4" />
        Add Time Entry
      </button>
      <Sheet open={open} onOpenChange={setOpen}>
        <AddShiftDrawer
          key={n}
          staff={staff}
          today={today}
          defaultStaffId={filters.staffId}
          onAdded={onAdded}
          onClose={onClose}
        />
      </Sheet>
    </>
  );
}
