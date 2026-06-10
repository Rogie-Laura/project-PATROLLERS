import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { extractBearerToken } from "@/lib/mobile/accessToken";

export const dynamic = "force-dynamic";

export async function POST(request) {
  const token = extractBearerToken(request);
  if (!token) {
    return NextResponse.json(
      { error: "Missing access token. Send Authorization: Bearer <token>." },
      { status: 401 }
    );
  }

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("record_mobile_heartbeat", {
    p_token: token,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data?.ok) {
    return NextResponse.json(
      { error: data?.error ?? "Heartbeat failed." },
      { status: 400 }
    );
  }

  return NextResponse.json({
    ok: true,
    last_seen_at: data.last_seen_at,
  });
}
