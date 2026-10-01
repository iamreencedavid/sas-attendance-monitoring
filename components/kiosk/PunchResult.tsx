import type { PunchType } from "@/lib/punch/types";

type Props = {
  name: string;
  type: PunchType;
  punchedAt: Date;
  photoUrl: string;
  onDone: () => void;
};

export function PunchResult({ name, type, punchedAt, photoUrl, onDone }: Props) {
  const time = punchedAt.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

  return (
    <div
      role="status"
      aria-live="assertive"
      className="fixed inset-0 z-10 flex items-center justify-center bg-espresso/80 p-4 backdrop-blur-sm"
      onClick={onDone}
    >
      <div className="w-full max-w-sm overflow-hidden rounded-3xl bg-white text-center shadow-2xl">
        {/* Blob object URL: next/image can't optimise it, a plain img is correct here. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photoUrl} alt={`Photo of ${name}`} className="aspect-4/3 w-full object-cover" />
        <div className="space-y-1 p-6">
          <p className="text-3xl" aria-hidden="true">✅</p>
          <p className="text-2xl font-bold">{name}</p>
          <p
            className={`text-lg font-semibold ${type === "in" ? "text-punch-in" : "text-punch-out"}`}
          >
            Punched {type === "in" ? "IN" : "OUT"} at {time}
          </p>
          <button
            type="button"
            autoFocus
            onClick={onDone}
            className="mt-3 rounded-full px-4 py-2 text-sm text-muted outline-none focus-visible:ring-4 focus-visible:ring-caramel/30"
          >
            Tap anywhere to continue
          </button>
        </div>
      </div>
    </div>
  );
}
