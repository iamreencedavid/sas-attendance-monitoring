import type { MonitoringFilters as Filters } from "@/lib/monitoring/types";
import type { StaffRecord } from "@/lib/staff/types";

const inputClass =
  "w-full rounded-[7px] border border-admin-line bg-white px-3 py-2 text-[13px] tabular-nums outline-none focus-visible:border-admin-slate focus-visible:ring-2 focus-visible:ring-admin-slate/20";

/** Same GET form as Monitoring, but one staff member must be picked. */
export function PayrollFilters({ staff, filters, today }: { staff: StaffRecord[]; filters: Filters; today: string }) {
  return (
    <form
      method="get"
      key={`${filters.staffId}|${filters.from}|${filters.to}`}
      className="mb-4 grid grid-cols-2 gap-2.5 sm:flex sm:items-end"
    >
      <label className="col-span-2 sm:w-56">
        <span className="mb-1 block text-xs font-bold text-admin-subtle">Staff</span>
        <select name="staff" defaultValue={filters.staffId} required className={`${inputClass} cursor-pointer`}>
          <option value="" disabled>
            Pick a staff member
          </option>
          {staff.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
              {s.active ? "" : " (inactive)"}
            </option>
          ))}
        </select>
      </label>
      <label className="sm:w-40">
        <span className="mb-1 block text-xs font-bold text-admin-subtle">From</span>
        <input type="date" name="from" defaultValue={filters.from} max={today} className={inputClass} />
      </label>
      <label className="sm:w-40">
        <span className="mb-1 block text-xs font-bold text-admin-subtle">To</span>
        <input type="date" name="to" defaultValue={filters.to} max={today} className={inputClass} />
      </label>
      <button
        type="submit"
        className="col-span-2 rounded-md bg-admin-slate px-3.5 py-2 text-sm font-bold text-white outline-none hover:bg-admin-slate/90 focus-visible:ring-2 focus-visible:ring-admin-slate focus-visible:ring-offset-2 sm:col-span-1"
      >
        Search
      </button>
    </form>
  );
}
