/** Route prefixes flipped to draft — blocked on public production marketing hosts. */
export const DRAFT_ROUTE_PREFIXES = [
  "/silent-collapse",
  "/platform",
  "/real-estate-media",
  "/axiom",
  "/products",
  "/apps",
  "/enterprise",
  "/final",
];

export function isDraftRoute(pathname) {
  if (typeof pathname !== "string" || pathname.length === 0) {
    return false;
  }

  const normalized = pathname.startsWith("/") ? pathname : `/${pathname}`;

  return DRAFT_ROUTE_PREFIXES.some(
    (prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`)
  );
}

export function isLocalhost(hostname) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

/** Block draft routes on production; keep localhost + preview available for internal work. */
export function shouldBlockDraftRoute(request) {
  const hostname = request.nextUrl.hostname;

  if (isLocalhost(hostname)) {
    return false;
  }

  if (process.env.VERCEL_ENV === "preview" || process.env.VERCEL_ENV === "development") {
    return false;
  }

  return true;
}
