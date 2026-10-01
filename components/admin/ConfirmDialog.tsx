"use client";

import type { ReactNode } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
  pending?: boolean;
  tone?: "default" | "danger";
  /** Extra detail under the description, e.g. the list of changes. */
  children?: ReactNode;
};

/**
 * Confirmation step before a save, built on shadcn's Base UI AlertDialog and
 * styled for the Roast Scale admin. Fully controlled: the caller keeps it open
 * while `pending` and closes it once the action returns.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  onConfirm,
  pending = false,
  tone = "default",
  children,
}: Props) {
  return (
    <AlertDialog open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
      <AlertDialogContent className="gap-5 rounded-xl p-5 font-admin text-admin-slate ring-admin-line sm:max-w-md">
        <AlertDialogHeader className="gap-2">
          <AlertDialogTitle className="text-lg font-extrabold tracking-tight">{title}</AlertDialogTitle>
          <AlertDialogDescription className="text-[13.5px] leading-relaxed text-admin-subtle">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {children}
        <AlertDialogFooter className="-mx-5 -mb-5 gap-2.5 border-admin-line bg-[#fbfbfc] px-5 py-4">
          <AlertDialogCancel
            disabled={pending}
            className="h-9 rounded-md border-admin-line px-3.5 text-sm font-bold text-admin-slate hover:bg-admin-mist"
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className={`h-9 rounded-md px-3.5 text-sm font-bold text-white ${
              tone === "danger" ? "bg-stamp hover:bg-stamp/90" : "bg-admin-slate hover:bg-admin-slate/90"
            }`}
          >
            {pending ? "Saving…" : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
