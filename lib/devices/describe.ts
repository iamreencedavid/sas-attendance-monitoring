/**
 * Readable labels from a user-agent string, enough for the owner to tell
 * devices apart ("Android tablet", "Chrome 141"). Browsers don't expose
 * hardware IDs, so this is a description, never an identity.
 */

function version(ua: string, re: RegExp): string {
  return ua.match(re)?.[1]?.split(".")[0] ?? "";
}

export function describeBrowser(ua: string): string {
  const pick = (name: string, re: RegExp) => `${name} ${version(ua, re)}`.trim();
  if (/SamsungBrowser\//.test(ua)) return pick("Samsung Internet", /SamsungBrowser\/([\d.]+)/);
  if (/EdgA?\//.test(ua)) return pick("Edge", /EdgA?\/([\d.]+)/);
  if (/OPR\//.test(ua)) return pick("Opera", /OPR\/([\d.]+)/);
  if (/Firefox\/|FxiOS\//.test(ua)) return pick("Firefox", /(?:Firefox|FxiOS)\/([\d.]+)/);
  if (/CriOS\//.test(ua)) return pick("Chrome", /CriOS\/([\d.]+)/);
  if (/Chrome\//.test(ua)) return pick("Chrome", /Chrome\/([\d.]+)/);
  if (/Safari\//.test(ua)) return pick("Safari", /Version\/([\d.]+)/);
  return "Unknown browser";
}

export function describeDevice(ua: string): string {
  if (/iPad/.test(ua)) return "iPad";
  if (/iPhone/.test(ua)) return "iPhone";
  if (/Android/.test(ua)) return /Mobile/.test(ua) ? "Android phone" : "Android tablet";
  // iPadOS asks for desktop sites by default and reports itself as a Mac.
  if (/Macintosh/.test(ua)) return "Mac or iPad";
  if (/Windows/.test(ua)) return "Windows computer";
  if (/CrOS/.test(ua)) return "Chromebook";
  if (/Linux/.test(ua)) return "Linux computer";
  return "Unknown device";
}

/** "Android tablet · Samsung SM-X115" when the browser shared its model. */
export function deviceLabel(ua: string, model: string | null): string {
  const kind = describeDevice(ua);
  return model ? `${kind} · ${model}` : kind;
}
