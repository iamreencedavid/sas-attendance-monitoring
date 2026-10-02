"use client";

import {
  CalendarClockIcon,
  LayoutDashboardIcon,
  SettingsIcon,
  TabletSmartphoneIcon,
  UserCogIcon,
  UsersIcon,
  WalletIcon,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { signOut } from "@/lib/auth/actions";
import cup from "@/public/brand/cup.png";

type NavItem = { href: string; label: string; icon: LucideIcon };

const NAV: NavItem[] = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboardIcon },
  { href: "/admin/monitoring", label: "Monitoring", icon: CalendarClockIcon },
  { href: "/admin/payroll", label: "Payroll", icon: WalletIcon },
  { href: "/admin/staff", label: "Staff", icon: UsersIcon },
];

// Below a divider: who can sign in to /admin, and which browsers can punch.
const ACCESS_NAV: NavItem[] = [
  { href: "/admin/users", label: "Users", icon: UserCogIcon },
  { href: "/admin/devices", label: "Devices", icon: TabletSmartphoneIcon },
];

// Its own group at the bottom: shop-wide settings.
const SETTINGS_NAV: NavItem[] = [{ href: "/admin/settings", label: "Settings", icon: SettingsIcon }];

export function AdminShell({ children, adminEmail }: { children: ReactNode; adminEmail: string }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const sidebar = (
    <nav aria-label="Admin" className="flex h-full flex-col px-3 py-5">
      <p className="flex items-center gap-2 px-2.5 pb-6 text-base font-extrabold tracking-tight">
        <Image src={cup} alt="" className="size-6 flex-none" />
        Sip and Simple
      </p>
      <NavList items={NAV} pathname={pathname} onNavigate={() => setMenuOpen(false)} />
      <hr className="mx-2.5 my-3 border-admin-line" />
      <NavList items={ACCESS_NAV} pathname={pathname} onNavigate={() => setMenuOpen(false)} />
      <hr className="mx-2.5 my-3 border-admin-line" />
      <NavList items={SETTINGS_NAV} pathname={pathname} onNavigate={() => setMenuOpen(false)} />
      <div className="mt-auto space-y-2 px-2.5 pt-6 text-xs text-admin-subtle">
        <p>Signed in as</p>
        <p className="truncate font-bold text-admin-slate" title={adminEmail}>
          {adminEmail}
        </p>
        <form action={signOut}>
          <button
            type="submit"
            className="w-full rounded-md border border-admin-line px-2.5 py-1.5 text-sm font-bold text-admin-slate outline-none hover:bg-admin-mist/60 focus-visible:ring-2 focus-visible:ring-admin-slate"
          >
            Sign out
          </button>
        </form>
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
          <span className="flex items-center gap-2 font-extrabold tracking-tight">
            <Image src={cup} alt="" className="size-6 flex-none" />
            Sip and Simple
          </span>
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

function NavList({
  items,
  pathname,
  onNavigate,
}: {
  items: NavItem[];
  pathname: string;
  onNavigate: () => void;
}) {
  return (
    <ul className="space-y-1">
      {items.map((item) => {
        const current = pathname.startsWith(item.href);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              aria-current={current ? "page" : undefined}
              onClick={onNavigate}
              className={`flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-bold outline-none focus-visible:ring-2 focus-visible:ring-admin-slate ${
                current ? "bg-admin-mist" : "text-admin-subtle hover:bg-admin-mist/60"
              }`}
            >
              <item.icon aria-hidden="true" className="size-[18px] flex-none" strokeWidth={2} />
              {item.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
