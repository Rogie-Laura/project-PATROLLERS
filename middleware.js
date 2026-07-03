import { NextResponse } from "next/server";

const DEFAULT_SMART_LOCATOR_HOSTS = [
  "patrollers-smartlocator.vercel.app",
  "patrollers-smart-locator.vercel.app",
];

function smartLocatorHosts() {
  const fromEnv = String(process.env.SMART_LOCATOR_HOSTS ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  return fromEnv.length > 0 ? fromEnv : DEFAULT_SMART_LOCATOR_HOSTS;
}

function isSmartLocatorHost(host) {
  const normalized = String(host ?? "").split(":")[0].toLowerCase();
  return smartLocatorHosts().some(
    (candidate) => normalized === candidate || normalized.endsWith(`.${candidate}`)
  );
}

export function middleware(request) {
  const host = request.headers.get("host");
  if (!isSmartLocatorHost(host)) {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;

  if (pathname === "/") {
    return NextResponse.rewrite(new URL("/smart-locator", request.url));
  }

  if (
    pathname.startsWith("/smart-locator") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/PNP") ||
    pathname.startsWith("/PRO4A")
  ) {
    return NextResponse.next();
  }

  return NextResponse.redirect(new URL(`/smart-locator${pathname}`, request.url));
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
