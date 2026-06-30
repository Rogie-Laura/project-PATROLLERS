import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { extractBearerToken, resolveAccessToken } from "@/lib/mobile/accessToken";
import {
  assertMobileDeviceBinding,
  extractDeviceIdFromRequest,
  TOKEN_IN_USE_CODE,
} from "@/lib/mobile/deviceBinding";

export const dynamic = "force-dynamic";

export async function POST(request) {
  const token = extractBearerToken(request);
  if (!token) {
    return NextResponse.json(
      { error: "Missing access token. Send Authorization: Bearer <token>." },
      { status: 401 }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const accessToken = await resolveAccessToken(token);
  if (!accessToken) {
    return NextResponse.json(
      { error: "Invalid or inactive access token." },
      { status: 401 }
    );
  }

  const deviceId = extractDeviceIdFromRequest(request, body);
  const bindingError = await assertMobileDeviceBinding(accessToken.id, deviceId);
  if (bindingError) {
    return NextResponse.json(
      { error: bindingError.error, code: bindingError.code ?? TOKEN_IN_USE_CODE },
      { status: bindingError.status }
    );
  }

  const fcmToken = String(body?.fcm_token ?? "").trim();
  if (!fcmToken) {
    return NextResponse.json({ error: "fcm_token is required." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("upsert_mobile_fcm_token", {
    p_token: token,
    p_fcm_token: fcmToken,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data?.ok) {
    return NextResponse.json(
      { error: data?.error ?? "Could not save FCM token." },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true });
}
