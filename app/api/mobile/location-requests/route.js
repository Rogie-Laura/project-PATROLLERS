import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { extractBearerToken } from "@/lib/mobile/accessToken";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const token = extractBearerToken(request);
  if (!token) {
    return NextResponse.json(
      { error: "Missing access token. Send Authorization: Bearer <token>." },
      { status: 401 }
    );
  }

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("get_mobile_location_requests", {
    p_token: token,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data?.ok) {
    return NextResponse.json(
      { error: data?.error ?? "Could not load location requests." },
      { status: 400 }
    );
  }

  return NextResponse.json({
    ok: true,
    requests: data.requests ?? [],
  });
}
