"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";

const NAV = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/monitoring", label: "Monitoring" },
  { href: "/admin/staff", label: "Staff" },
];

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const sidebar = (
    <nav aria-label="Admin" className="flex h-full flex-col px-3 py-5">
      <p className="px-2.5 pb-6 text-base font-extrabold tracking-tight">Sip and Simple</p>
      <ul className="space-y-1">
        {NAV.map((item) => {
          const current = pathname.startsWith(item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={current ? "page" : undefined}
                onClick={() => setMenuOpen(false)}
                className={`block rounded-md px-2.5 py-2 text-sm font-bold outline-none focus-visible:ring-2 focus-visible:ring-admin-slate ${
                  current ? "bg-admin-mist" : "text-admin-subtle hover:bg-admin-mist/60"
                }`}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
      <div className="mt-auto space-y-2 px-2.5 text-xs text-admin-subtle">
        <p className="inline-block rounded bg-roast-light px-1.5 py-0.5 font-bold text-roast-light-ink">
          No login yet
        </p>
        <p>Owner view</p>
      </div>
    </nav>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden w-52 flex-none border-r border-admin-line bg-white md:block">
        <div className="sticky top-0 h-dvh">{sidebar}</div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="flex items-center justify-between border-b border-admin-line bg-white px-4 py-3 md:hidden">
          <span className="font-extrabold tracking-tight">Sip and Simple</span>
          <button
            type="button"
            aria-expanded={menuOpen}
            aria-controls="admin-mobile-nav"
            onClick={() => setMenuOpen((open) => !open)}
            className="rounded-md border border-admin-line px-3 py-1.5 text-sm font-bold outline-none focus-visible:ring-2 focus-visible:ring-admin-slate"
          >
            {menuOpen ? "Close" : "Menu"}
          </button>
        </header>
        {menuOpen && (
          <div id="admin-mobile-nav" className="border-b border-admin-line bg-white md:hidden">
            {sidebar}
          </div>
        )}

        <main className="flex-1 px-4 py-6 sm:px-6 md:px-8 md:py-7">{children}</main>
      </div>
    </>
  );
}
