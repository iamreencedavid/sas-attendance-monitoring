import type { PunchType, Staff, StaffRole } from "@/lib/punch/types";

const ROLE_LABELS: Record<StaffRole, string> = {
  barista: "Barista",
  kitchen: "Kitchen",
  supervisor: "Supervisor",
};

type Props = {
  staff: Staff[];
  loadError: boolean;
  staffId: string;
  pin: string;
  statusText: string | null;
  allowedType: PunchType | null;
  submitting: PunchType | null;
  cameraReady: boolean;
  error: string | null;
  onStaffChange: (staffId: string) => void;
  onPinChange: (pin: string) => void;
  onPunch: (type: PunchType) => void;
};

const fieldClass =
  "w-full rounded-xl border border-latte bg-cream/40 px-4 py-3 text-lg outline-none focus-visible:border-caramel focus-visible:ring-4 focus-visible:ring-caramel/30 disabled:opacity-60";

export function PunchPanel({
  staff,
  loadError,
  staffId,
  pin,
  statusText,
  allowedType,
  submitting,
  cameraReady,
  error,
  onStaffChange,
  onPinChange,
  onPunch,
}: Props) {
  const busy = submitting !== null;
  const noStaff = loadError || staff.length === 0;
  const listMessage = loadError
    ? "Couldn't load the staff list. Check the connection and reload."
    : staff.length === 0
      ? "No staff yet. Ask the owner to add staff."
      : null;
  const canPunch = cameraReady && !busy && staffId !== "" && pin.length >= 4;

  return (
    <section
      aria-label="Punch in or out"
      className="flex flex-col gap-4 rounded-2xl border border-latte bg-white p-4 sm:p-5 lg:min-h-0"
    >
      <div className="space-y-1.5">
        <label htmlFor="staff" className="text-sm font-semibold">
          Name
        </label>
        <select
          id="staff"
          value={staffId}
          disabled={busy || noStaff}
          onChange={(e) => onStaffChange(e.target.value)}
          className={fieldClass}
        >
          <option value="">Select your name</option>
          {staff.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} · {ROLE_LABELS[s.role]}
            </option>
          ))}
        </select>
        <p
          aria-live="polite"
          className={`min-h-5 text-sm ${listMessage ? "font-medium text-punch-out" : "text-mocha"}`}
        >
          {listMessage ?? statusText}
        </p>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="pin" className="text-sm font-semibold">
          PIN
        </label>
        <input
          id="pin"
          type="password"
          inputMode="numeric"
          pattern="\d{4,6}"
          maxLength={6}
          autoComplete="off"
          placeholder="4–6 digits"
          value={pin}
          disabled={busy || staffId === ""}
          onChange={(e) => onPinChange(e.target.value.replace(/\D/g, ""))}
          onKeyDown={(e) => {
            if (e.key === "Enter" && canPunch && allowedType) onPunch(allowedType);
          }}
          className={`${fieldClass} tracking-[0.5em] placeholder:tracking-normal`}
        />
      </div>

      <p role="alert" className="min-h-5 text-sm font-medium text-punch-out">
        {error ?? (cameraReady ? null : "The camera is needed to punch. Ask the owner for help.")}
      </p>

      <div className="sticky bottom-0 -mx-4 -mb-4 mt-auto grid grid-cols-2 gap-3 rounded-b-2xl bg-white/95 p-4 backdrop-blur sm:-mx-5 sm:-mb-5 sm:p-5 lg:static lg:m-0 lg:min-h-56 lg:flex-1 lg:grid-cols-1 lg:grid-rows-2 lg:p-0">
        <PunchButton
          type="in"
          disabled={!canPunch || allowedType !== "in"}
          loading={submitting === "in"}
          onClick={() => onPunch("in")}
        />
        <PunchButton
          type="out"
          disabled={!canPunch || allowedType !== "out"}
          loading={submitting === "out"}
          onClick={() => onPunch("out")}
        />
      </div>
    </section>
  );
}

function PunchButton({
  type,
  disabled,
  loading,
  onClick,
}: {
  type: PunchType;
  disabled: boolean;
  loading: boolean;
  onClick: () => void;
}) {
  const color =
    type === "in"
      ? "bg-punch-in focus-visible:ring-punch-in/40"
      : "bg-punch-out focus-visible:ring-punch-out/40";

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-busy={loading}
      className={`${color} min-h-[72px] rounded-2xl px-3 text-xl font-extrabold tracking-wider text-white shadow-sm outline-none transition active:scale-[0.98] focus-visible:ring-4 disabled:bg-latte disabled:text-mocha disabled:shadow-none disabled:active:scale-100 sm:text-2xl lg:text-4xl`}
    >
      {loading ? "Saving…" : type === "in" ? "PUNCH IN" : "PUNCH OUT"}
    </button>
  );
}
