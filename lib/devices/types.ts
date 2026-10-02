/** A registered browser on the current request, as the punch page sees it. */
export type CurrentDevice = { id: string; name: string };

/** A registered browser, as /admin/devices shows it. Dates are formatted on the server. */
export type DeviceRecord = {
  id: string;
  name: string;
  deviceLabel: string;
  browserLabel: string;
  screen: string | null;
  revoked: boolean;
  /** Whether this row is the browser making the request. */
  isThisBrowser: boolean;
  registeredAt: string;
  registeredBy: string | null;
  /** e.g. "Today, 8:02 AM", or "Never". */
  lastUsed: string;
  lastIp: string | null;
  lastCity: string | null;
  revokedAt: string | null;
  revokedBy: string | null;
  punchCount: number;
};

/** What /admin/devices knows about the browser viewing it. */
export type ThisBrowser = {
  deviceId: string | null;
  deviceLabel: string;
  browserLabel: string;
  ip: string | null;
  city: string | null;
};

export type DeviceActionState = {
  ok: boolean;
  /** Bumps on every success so the drawer can react to repeat saves. */
  savedAt?: number;
  message?: string;
  errors?: { name?: string };
};
