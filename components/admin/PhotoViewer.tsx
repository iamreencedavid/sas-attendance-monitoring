"use client";

import { ZoomInIcon } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

/**
 * Makes a punch-photo thumbnail clickable: opens the photo large in a dialog
 * with a one-line caption. Only use it when there is a photo URL.
 */
export function PhotoButton({
  src,
  caption,
  className = "",
  children,
}: {
  src: string;
  /** e.g. "Jhen · IN 10:12 · Thu 1 Oct · Kiosk" */
  caption: string;
  className?: string;
  /** The thumbnail markup. */
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setFailed(false);
          setOpen(true);
        }}
        aria-label={`View photo: ${caption}`}
        className={`group/photo relative block flex-none cursor-zoom-in rounded-md outline-none focus-visible:ring-2 focus-visible:ring-admin-slate focus-visible:ring-offset-2 ${className}`}
      >
        {children}
        <span
          aria-hidden="true"
          className="absolute right-1 bottom-1 flex size-5 items-center justify-center rounded bg-black/55 text-white opacity-0 transition-opacity group-hover/photo:opacity-100 group-focus-visible/photo:opacity-100"
        >
          <ZoomInIcon className="size-3.5" />
        </span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="gap-3 bg-white p-3 font-admin text-admin-slate sm:max-w-2xl">
          <DialogTitle className="sr-only">Punch photo</DialogTitle>
          <div className="flex min-h-48 items-center justify-center overflow-hidden rounded-lg bg-admin-mist">
            {failed ? (
              <p className="px-6 py-16 text-center text-sm text-admin-subtle">
                This photo link expired. Reload the page to see it.
              </p>
            ) : (
              // Short-lived signed Supabase URL, so next/image optimisation doesn't apply.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={src} alt={caption} onError={() => setFailed(true)} className="max-h-[75dvh] w-auto object-contain" />
            )}
          </div>
          <p className="px-1 pr-8 text-sm font-semibold tabular-nums">{caption}</p>
        </DialogContent>
      </Dialog>
    </>
  );
}
