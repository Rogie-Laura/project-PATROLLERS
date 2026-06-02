import { NextResponse } from "next/server";
import { resolveAccessToken } from "@/lib/mobile/accessToken";
import { getLocationIntervalSeconds } from "@/lib/mobile/systemSettings";

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

  const intervalSeconds = await getLocationIntervalSeconds();

  return NextResponse.json({
    ok: true,
    token: accessToken.token,
    label: accessToken.label,
    interval_seconds: intervalSeconds,
    interval_minutes: Math.max(1, Math.ceil(intervalSeconds / 60)),
  });
}

export async function GET() {
  const intervalSeconds = await getLocationIntervalSeconds();

  return NextResponse.json({
    ok: true,
    interval_seconds: intervalSeconds,
    interval_minutes: Math.max(1, Math.ceil(intervalSeconds / 60)),
  });
}
