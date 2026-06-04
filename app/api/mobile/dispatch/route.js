import { NextResponse } from "next/server";
import { extractBearerToken, resolveAccessToken } from "@/lib/mobile/accessToken";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

async function requireMobileToken(request) {
  const token = extractBearerToken(request);
  if (!token) {
    return {
      error: NextResponse.json(
        { error: "Missing access token. Send Authorization: Bearer <token>." },
        { status: 401 }
      ),
    };
  }

  const accessToken = await resolveAccessToken(token);
  if (!accessToken) {
    return {
      error: NextResponse.json(
        { error: "Invalid or inactive access token." },
        { status: 401 }
      ),
    };
  }

  return { token, accessToken };
}

export async function GET(request) {
  const auth = await requireMobileToken(request);
  if (auth.error) return auth.error;

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("get_mobile_dispatches", {
    p_token: auth.token,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (data?.ok === false) {
    return NextResponse.json(
      { error: data.error ?? "Could not load alerts." },
      { status: 401 }
    );
  }

  return NextResponse.json({
    ok: true,
    dispatches: data?.dispatches ?? [],
  });
}
