import { CameraIcon } from "lucide-react";
import { PhotoButton } from "@/components/admin/PhotoViewer";
import type { ShiftPunch } from "@/lib/monitoring/types";
import { formatDateKey, formatDuration } from "@/lib/time";

/** Punch photo, or a placeholder when there is none (manual or purged). */
export function Thumb({ punch, className = "size-9" }: { punch: ShiftPunch; className?: string }) {
  if (!punch.photoUrl) {
    return (
      <span className={`flex flex-none items-center justify-center rounded-md bg-admin-mist text-admin-subtle ${className}`}>
        <CameraIcon aria-hidden="true" className="size-4" />
        <span className="sr-only">No photo</span>
      </span>
    );
  }
  return (
    // Short-lived signed Supabase URL, so next/image optimisation doesn't apply.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={punch.photoUrl}
      alt={`${punch.type === "in" ? "IN" : "OUT"} photo at ${punch.time}`}
      className={`flex-none rounded-md bg-admin-mist object-cover ${className}`}
    />
  );
}

/** "Jhen · IN 10:12 · Thu 1 Oct · Kiosk" */
export function punchCaption(punch: ShiftPunch, name: string): string {
  const type = punch.type === "in" ? "IN" : "OUT";
  const source = punch.source === "kiosk" ? "Kiosk" : "Manual";
  return `${name} · ${type} ${punch.time} · ${formatDateKey(punch.dateKey)} · ${source}`;
}

/** Thumb that opens the photo viewer when there is a photo. */
export function PunchThumb({ punch, name, className = "size-9" }: { punch: ShiftPunch; name: string; className?: string }) {
  if (!punch.photoUrl) return <Thumb punch={punch} className={className} />;
  return (
    <PhotoButton src={punch.photoUrl} caption={punchCaption(punch, name)} className={className}>
      <Thumb punch={punch} className="size-full" />
    </PhotoButton>
  );
}

export function LateTag({ minutes }: { minutes: number }) {
  return (
    <span className="rounded-[5px] bg-stamp/10 px-1.5 py-0.5 text-[11px] font-bold text-stamp">
      Late {formatDuration(minutes)}
    </span>
  );
}

export function EditedMark() {
  return (
    <span title="Entered or changed by the owner" className="text-[11px] font-bold text-roast-light-ink">
      ✎ edited
    </span>
  );
}
