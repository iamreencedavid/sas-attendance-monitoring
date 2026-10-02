import type { TodayStatus } from "@/lib/dashboard/types";

export const STATUS_LABELS: Record<TodayStatus, string> = {
  late: "Late",
  on_shift: "On shift",
  not_in: "Not in yet",
  done: "Done",
  missing_out: "Missing OUT",
  day_off: "Day off",
};

/** Colour band at the top of a card, and the matching pill in the drawer. */
export const STATUS_BANDS: Record<TodayStatus, string> = {
  late: "bg-stamp text-white",
  on_shift: "bg-ok text-white",
  done: "bg-admin-slate text-white",
  not_in: "bg-admin-mist text-admin-subtle",
  missing_out: "bg-stamp/10 text-stamp",
  day_off: "bg-admin-mist text-admin-subtle",
};

/** Filter chip order. */
export const STATUS_ORDER: TodayStatus[] = ["late", "on_shift", "not_in", "done", "day_off", "missing_out"];
