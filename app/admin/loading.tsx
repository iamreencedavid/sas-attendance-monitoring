import { BobbingCup } from "@/components/BobbingCup";

/**
 * Shown in the page area while an admin page loads; the sidebar stays.
 * Appears when moving between admin pages (the layout's sign-in check
 * still blocks a first load or refresh).
 */
export default function AdminLoading() {
  return (
    <div role="status" aria-live="polite" className="animate-loader-in flex min-h-[60dvh] flex-col items-center justify-center gap-3.5">
      <BobbingCup />
      <p className="text-[15px] font-bold text-admin-subtle">Brewing…</p>
      <span className="sr-only">Loading page</span>
    </div>
  );
}
