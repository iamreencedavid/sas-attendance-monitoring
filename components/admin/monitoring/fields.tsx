export const inputClass =
  "w-full rounded-[7px] border bg-white px-3 py-2 text-sm tabular-nums outline-none focus-visible:border-admin-slate focus-visible:ring-2 focus-visible:ring-admin-slate/20";
export const primaryBtn =
  "rounded-md bg-admin-slate px-3.5 py-2 text-sm font-bold text-white outline-none hover:bg-admin-slate/90 focus-visible:ring-2 focus-visible:ring-admin-slate focus-visible:ring-offset-2 disabled:opacity-60";
export const secondaryBtn =
  "rounded-md border border-admin-line bg-white px-3.5 py-2 text-sm font-bold text-admin-slate outline-none hover:bg-admin-mist focus-visible:ring-2 focus-visible:ring-admin-slate disabled:opacity-60";

/** Border for an input, red while it has an error. */
export function borderClass(error: string | undefined): string {
  return error ? "border-stamp ring-2 ring-stamp/15" : "border-admin-line";
}

/** Error or hint line under a field. */
export function FieldMessage({ id, error, hint }: { id: string; error?: string; hint?: React.ReactNode }) {
  return (
    <div id={id} className="mt-1.5 min-h-4 text-xs">
      {error ? <span className="font-semibold text-stamp">{error}</span> : <span className="text-admin-subtle">{hint}</span>}
    </div>
  );
}

export function TimeField({
  id,
  label,
  name,
  value,
  onChange,
  error,
  hint,
}: {
  id: string;
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-[12.5px] font-bold">{label}</label>
      <input
        id={id}
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        inputMode="numeric"
        placeholder="HH:MM"
        maxLength={5}
        autoComplete="off"
        aria-invalid={!!error}
        aria-describedby={`${id}-msg`}
        className={`${inputClass} ${borderClass(error)}`}
      />
      <FieldMessage id={`${id}-msg`} error={error} hint={hint} />
    </div>
  );
}
