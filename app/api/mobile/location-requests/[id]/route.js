import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { extractBearerToken } from "@/lib/mobile/accessToken";

export const dynamic = "force-dynamic";

/** Mark a force-location item success after the unit sent GPS. */
export async function PATCH(request, { params }) {
  const token = extractBearerToken(request);
  if (!token) {
    return NextResponse.json(
      { error: "Missing access token. Send Authorization: Bearer <token>." },
      { status: 401 }
    );
  }

  const { id: itemId } = await params;
  if (!itemId) {
    return NextResponse.json({ error: "Missing request id." }, { status: 400 });
  }

  let body = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const locationUpdateId = body?.location_update_id ?? body?.locationUpdateId ?? null;

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("acknowledge_location_request", {
    p_token: token,
    p_item_id: itemId,
    p_location_update_id: locationUpdateId,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data?.ok) {
    return NextResponse.json(
      { error: data?.error ?? "Could not acknowledge location request." },
      { status: 400 }
    );
  }

  return NextResponse.json({
    ok: true,
    already: data.already === true,
    location_update_id: data.location_update_id ?? locationUpdateId,
  });
}
