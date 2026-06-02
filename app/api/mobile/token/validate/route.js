import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import {
  MOBILE_LOCATION_INTERVAL_MINUTES,
  resolveAccessToken,
} from "@/lib/mobile/accessToken";

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const token = String(body?.token ?? "").trim();
  if (!token) {
    return NextResponse.json({ error: "Enter your access token." }, { status: 400 });
  }

  const accessToken = await resolveAccessToken(token);
  if (!accessToken) {
    return NextResponse.json({ error: "Invalid or inactive access token." }, { status: 401 });
  }

  return NextResponse.json({
    ok: true,
    token: accessToken.token,
    label: accessToken.label,
    interval_minutes: MOBILE_LOCATION_INTERVAL_MINUTES,
  });
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    interval_minutes: MOBILE_LOCATION_INTERVAL_MINUTES,
  });
}
