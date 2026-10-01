"use client";

import { useMemo, useState } from "react";
import { Sheet } from "@/components/ui/sheet";
import type { UserRecord } from "@/lib/users/types";
import { UserDrawer } from "./UserDrawer";

type Filter = "all" | "active" | "disabled";
type DrawerTarget = null | "new" | string;

function RoleBadge({ user }: { user: UserRecord }) {
  return user.role === "owner" ? (
    <span className="inline-block rounded-[5px] bg-roast-dark px-2 py-0.5 text-xs font-bold text-roast-dark-ink">Owner</span>
  ) : (
    <span className="inline-block rounded-[5px] bg-admin-mist px-2 py-0.5 text-xs font-bold text-admin-slate">Admin</span>
  );
}

function Status({ user }: { user: UserRecord }) {
  return user.disabled ? (
    <span className="text-[13px] font-bold text-admin-subtle">Disabled</span>
  ) : (
    <span className="text-[13px] font-bold text-ok">Active</span>
  );
}

function You({ user, selfId }: { user: UserRecord; selfId: string }) {
  return user.id === selfId ? <span className="ml-1.5 font-semibold text-admin-subtle">(you)</span> : null;
}

const OWNER_HINT = "Change with npm run db:owner";

export function UsersTable({ users, selfId }: { users: UserRecord[]; selfId: string }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [drawer, setDrawer] = useState<DrawerTarget>(null);
  // What the drawer last showed, kept while it animates closed.
  const [shown, setShown] = useState<{ target: "new" | string; key: number }>({ target: "new", key: 0 });

  function openDrawer(target: "new" | string) {
    setDrawer(target);
    setShown((prev) => ({ target, key: prev.key + 1 }));
  }

  const counts = useMemo(() => {
    const disabled = users.filter((u) => u.disabled).length;
    return { all: users.length, active: users.length - disabled, disabled };
  }, [users]);

  const q = query.trim().toLowerCase();
  const rows = users.filter((u) => {
    if (filter === "active" && u.disabled) return false;
    if (filter === "disabled" && !u.disabled) return false;
    return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
  });

  // Look the record up from fresh props so the drawer shows saved changes.
  const editing = shown.target !== "new" ? users.find((u) => u.id === shown.target) : undefined;

  const filters: { key: Filter; label: string }[] = [
    { key: "all", label: `All ${counts.all}` },
    { key: "active", label: `Active ${counts.active}` },
    { key: "disabled", label: `Disabled ${counts.disabled}` },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Users</h1>
          <p className="mt-0.5 text-[13px] text-admin-subtle">People who can sign in to this admin.</p>
        </div>
        <button
          type="button"
          onClick={() => openDrawer("new")}
          className="rounded-md bg-admin-slate px-3.5 py-2 text-sm font-bold text-white outline-none hover:bg-admin-slate/90 focus-visible:ring-2 focus-visible:ring-admin-slate focus-visible:ring-offset-2"
        >
          Add user
        </button>
      </div>

      <div className="mb-3 flex flex-col gap-2.5 sm:flex-row sm:items-center">
        <div role="group" aria-label="Show" className="flex w-fit rounded-[7px] bg-admin-mist p-[3px] text-[13px] font-semibold">
          {filters.map((f) => (
            <button
              key={f.key}
              type="button"
              aria-pressed={filter === f.key}
              onClick={() => setFilter(f.key)}
              className={`rounded-[5px] px-3 py-1.5 outline-none focus-visible:ring-2 focus-visible:ring-admin-slate ${
                filter === f.key ? "bg-white text-admin-slate shadow-sm" : "text-admin-subtle"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <label className="sm:w-64">
          <span className="sr-only">Search by name or email</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or email"
            className="w-full rounded-[7px] border border-admin-line bg-white px-3 py-2 text-[13px] outline-none placeholder:text-admin-subtle focus-visible:border-admin-slate focus-visible:ring-2 focus-visible:ring-admin-slate/20"
          />
        </label>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-[10px] border border-admin-line bg-white px-4 py-10 text-center text-sm text-admin-subtle">
          {q ? `No one matches "${query.trim()}".` : "No one here."}
        </p>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-[10px] border border-admin-line bg-white md:block">
            <table className="w-full border-collapse text-[13.5px]">
              <thead>
                <tr className="bg-[#fbfbfc] text-left text-xs font-bold text-admin-subtle">
                  <th className="px-3.5 py-2.5 font-bold">Name</th>
                  <th className="px-3.5 py-2.5 font-bold">Email</th>
                  <th className="px-3.5 py-2.5 font-bold">Role</th>
                  <th className="px-3.5 py-2.5 font-bold">Status</th>
                  <th className="px-3.5 py-2.5 font-bold">Last sign in</th>
                  <th className="px-3.5 py-2.5"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((u) => (
                  <tr
                    key={u.id}
                    className={`border-t border-[#eef0f2] tabular-nums ${u.disabled ? "text-admin-subtle" : ""} ${drawer === u.id ? "bg-admin-mist" : ""}`}
                  >
                    <td className="px-3.5 py-3 font-bold">
                      {u.name}
                      <You user={u} selfId={selfId} />
                    </td>
                    <td className="px-3.5 py-3">{u.email}</td>
                    <td className="px-3.5 py-3"><RoleBadge user={u} /></td>
                    <td className="px-3.5 py-3"><Status user={u} /></td>
                    <td className="px-3.5 py-3">{u.lastSignIn}</td>
                    <td className="px-3.5 py-3 text-right">
                      {u.role === "owner" ? (
                        <span className="text-xs text-admin-subtle">{OWNER_HINT}</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => openDrawer(u.id)}
                          className="rounded px-1 text-[13px] font-bold text-admin-slate underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-admin-slate"
                        >
                          Edit<span className="sr-only"> {u.name}</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Phone list */}
          <ul className="space-y-2 md:hidden">
            {rows.map((u) => {
              const body = (
                <>
                  <span className="flex items-center justify-between gap-2">
                    <span className="min-w-0 truncate font-bold">
                      {u.name}
                      <You user={u} selfId={selfId} />
                    </span>
                    <Status user={u} />
                  </span>
                  <span className="mt-1 block truncate text-[13px]">{u.email}</span>
                  <span className="mt-2 flex items-center gap-3 text-[13px] text-admin-subtle">
                    <RoleBadge user={u} />
                    <span>Last sign in {u.lastSignIn}</span>
                  </span>
                  {u.role === "owner" && <span className="mt-1.5 block text-xs text-admin-subtle">{OWNER_HINT}</span>}
                </>
              );
              const cardClass = `block w-full rounded-[10px] border border-admin-line bg-white p-3.5 text-left tabular-nums ${u.disabled ? "text-admin-subtle" : ""}`;
              return (
                <li key={u.id}>
                  {u.role === "owner" ? (
                    <div className={cardClass}>{body}</div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => openDrawer(u.id)}
                      className={`${cardClass} outline-none focus-visible:ring-2 focus-visible:ring-admin-slate`}
                    >
                      {body}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}

      <Sheet open={drawer !== null} onOpenChange={(open) => !open && setDrawer(null)}>
        {shown.target === "new" ? (
          <UserDrawer key={shown.key} mode={{ kind: "new" }} selfId={selfId} onClose={() => setDrawer(null)} />
        ) : (
          editing &&
          editing.role !== "owner" && (
            <UserDrawer key={shown.key} mode={{ kind: "edit", user: editing }} selfId={selfId} onClose={() => setDrawer(null)} />
          )
        )}
      </Sheet>
    </div>
  );
}
