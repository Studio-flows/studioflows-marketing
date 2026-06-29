import { NextResponse } from "next/server";

import { isDraftRoute, isLocalhost, shouldBlockDraftRoute } from "./lib/draft-routes";

const ALLOWED_COUNTRIES = new Set(["US", "CO"]);
const GEO_BLOCKED_REDIRECT_PATH = "/qualifier/us-only";

export function middleware(request) {
  const { pathname } = request.nextUrl;

  if (isDraftRoute(pathname) && shouldBlockDraftRoute(request)) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const hostname = request.nextUrl.hostname;
  const country =
    request.geo?.country ||
    request.headers.get("x-vercel-ip-country") ||
    request.headers.get("cf-ipcountry") ||
    "";

  if (isLocalhost(hostname)) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/services/custom-ops-hub")) {
    if (country && !ALLOWED_COUNTRIES.has(country)) {
      const redirectUrl = new URL(GEO_BLOCKED_REDIRECT_PATH, request.url);
      redirectUrl.search = request.nextUrl.search;
      return NextResponse.redirect(redirectUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/services/custom-ops-hub/:path*",
    "/silent-collapse",
    "/silent-collapse/:path*",
    "/platform",
    "/platform/:path*",
    "/real-estate-media",
    "/real-estate-media/:path*",
    "/axiom",
    "/axiom/:path*",
    "/products",
    "/products/:path*",
    "/apps",
    "/apps/:path*",
    "/enterprise",
    "/enterprise/:path*",
    "/final",
    "/final/:path*",
  ],
};
