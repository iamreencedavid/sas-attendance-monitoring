"use client";

import { useSyncExternalStore } from "react";

function subscribe(onTick: () => void) {
  const id = setInterval(onTick, 1000);
  return () => clearInterval(id);
}

// Snapshot is whole seconds so it stays stable between ticks.
const getSnapshot = () => Math.floor(Date.now() / 1000);
// Render nothing on the server so the time never mismatches on hydration.
const getServerSnapshot = () => null;

export function Clock() {
  const seconds = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  if (seconds === null) return <span className="tabular-nums">&nbsp;</span>;

  const now = new Date(seconds * 1000);
  return (
    <span className="tabular-nums">
      <span className="hidden sm:inline">
        {now.toLocaleDateString(undefined, {
          weekday: "short",
          month: "short",
          day: "numeric",
        })}
        {" · "}
      </span>
      {now.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
    </span>
  );
}
