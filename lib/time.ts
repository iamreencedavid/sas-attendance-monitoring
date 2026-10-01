/** Shop timezone (PRD §5). All "today" groupings use it, never the server's clock zone. */
export const SHOP_TIMEZONE = process.env.SHOP_TIMEZONE || "Asia/Manila";

export type ShopNow = {
  /** "Thu 1 Oct 2026" */
  dateLabel: string;
  /** "2026-10-01" */
  dateKey: string;
  /** "10:40" (24h) */
  time: string;
  /** Minutes since shop midnight. */
  minutes: number;
};

export function shopNow(now = new Date()): ShopNow {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: SHOP_TIMEZONE,
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  );
  const month = new Intl.DateTimeFormat("en-CA", { timeZone: SHOP_TIMEZONE, month: "2-digit" }).format(now);
  return {
    dateLabel: `${parts.weekday} ${parts.day} ${parts.month} ${parts.year}`,
    dateKey: `${parts.year}-${month}-${parts.day.padStart(2, "0")}`,
    time: `${parts.hour}:${parts.minute}`,
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
  };
}

/** Minutes (may pass 24h on an overnight shift) → "HH:MM". */
export function formatClock(minutes: number): string {
  const m = ((minutes % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

/** 284 → "4h 44m", 40 → "40m". */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? `${h}h ${String(m).padStart(2, "0")}m` : `${m}m`;
}

/** The shop's calendar date for an instant: "2026-10-01". */
export function shopDateKey(date = new Date()): string {
  return shopNow(date).dateKey;
}

/** Offset of the shop timezone from UTC at an instant, in minutes (Manila: +480). */
function shopOffsetMinutes(at: Date): number {
  const name = new Intl.DateTimeFormat("en-US", { timeZone: SHOP_TIMEZONE, timeZoneName: "longOffset" })
    .formatToParts(at)
    .find((p) => p.type === "timeZoneName")?.value;
  const match = name?.match(/GMT([+-])(\d{2}):(\d{2})/);
  if (!match) return 0; // "GMT" alone means UTC
  const minutes = Number(match[2]) * 60 + Number(match[3]);
  return match[1] === "-" ? -minutes : minutes;
}

/** Shop midnight at the start of `dateKey`, as a UTC instant. */
export function shopDayStart(dateKey: string): Date {
  const utcMidnight = new Date(`${dateKey}T00:00:00Z`);
  return new Date(utcMidnight.getTime() - shopOffsetMinutes(utcMidnight) * 60_000);
}

/** `dateKey` moved by whole days: addDays("2026-10-01", -1) → "2026-09-30". */
export function addDays(dateKey: string, days: number): string {
  const d = new Date(`${dateKey}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
