import { NextResponse } from "next/server";
import { resolveAccessToken } from "@/lib/mobile/accessToken";
import {
  bindMobileDevice,
  normalizeDeviceId,
  releaseMobileDeviceBinding,
  TOKEN_IN_USE_CODE,
  TOKEN_IN_USE_MESSAGE,
} from "@/lib/mobile/deviceBinding";
import { getLocationIntervalSeconds } from "@/lib/mobile/systemSettings";

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const token = String(body?.token ?? "").trim();
  const deviceId = normalizeDeviceId(body?.device_id);

  if (!token) {
    return NextResponse.json({ error: "Enter your access token." }, { status: 400 });
  }

  if (!deviceId) {
    return NextResponse.json({ error: "Missing device id." }, { status: 400 });
  }

  const accessToken = await resolveAccessToken(token);
  if (!accessToken) {
    return NextResponse.json({ error: "Invalid or inactive access token." }, { status: 401 });
  }

  try {
    await releaseMobileDeviceBinding(token, deviceId);
  } catch (error) {
    return NextResponse.json(
      { error: error.message ?? "Could not release token binding." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, released: true });
}
