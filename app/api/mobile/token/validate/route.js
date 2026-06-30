import { NextResponse } from "next/server";
import { resolveAccessToken } from "@/lib/mobile/accessToken";
import {
  bindMobileDevice,
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
  if (!token) {
    return NextResponse.json({ error: "Enter your access token." }, { status: 400 });
  }

  const accessToken = await resolveAccessToken(token);
  if (!accessToken) {
    return NextResponse.json({ error: "Invalid or inactive access token." }, { status: 401 });
  }

  let binding;
  try {
    binding = await bindMobileDevice(accessToken.id, body?.device_id);
  } catch (error) {
    return NextResponse.json(
      { error: error.message ?? "Could not verify device binding." },
      { status: 500 }
    );
  }

  if (binding.ok !== true) {
    const status = binding.code === TOKEN_IN_USE_CODE ? 409 : 403;
    return NextResponse.json(
      {
        error: binding.error ?? TOKEN_IN_USE_MESSAGE,
        code: binding.code ?? TOKEN_IN_USE_CODE,
      },
      { status }
    );
  }

  const intervalSeconds = await getLocationIntervalSeconds();

  return NextResponse.json({
    ok: true,
    token: accessToken.token,
    access_token_id: accessToken.id,
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
