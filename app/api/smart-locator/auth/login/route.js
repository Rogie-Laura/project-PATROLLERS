import { NextResponse } from "next/server";
import {
  buildSmartLocatorSessionCookie,
  createSmartLocatorSession,
  resolveSmartLocatorAccessToken,
} from "@/lib/smartLocator/accessTokenAuth";

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const token = String(body?.token ?? "").trim();
  if (!token) {
    return NextResponse.json(
      { error: "Enter your access token." },
      { status: 400 }
    );
  }

  const accessToken = await resolveSmartLocatorAccessToken(token);
  if (!accessToken) {
    return NextResponse.json(
      { error: "Invalid or inactive access token." },
      { status: 401 }
    );
  }

  try {
    const { sessionToken, user } = await createSmartLocatorSession(accessToken);
    const response = NextResponse.json({
      ok: true,
      user,
      scope: {
        office: user.office,
        unit: user.unit,
      },
    });
    response.cookies.set(buildSmartLocatorSessionCookie(sessionToken));
    return response;
  } catch {
    return NextResponse.json(
      { error: "Could not start Smart Locator session." },
      { status: 500 }
    );
  }
}
