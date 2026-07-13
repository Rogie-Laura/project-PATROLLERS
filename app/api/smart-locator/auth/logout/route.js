import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  SMART_LOCATOR_SESSION_COOKIE,
  clearSmartLocatorSession,
  clearSmartLocatorSessionCookie,
} from "@/lib/smartLocator/accessTokenAuth";

export async function POST() {
  const store = await cookies();
  const sessionToken = store.get(SMART_LOCATOR_SESSION_COOKIE)?.value;
  await clearSmartLocatorSession(sessionToken || null);

  const response = NextResponse.json({ ok: true });
  response.cookies.set(clearSmartLocatorSessionCookie());
  return response;
}
