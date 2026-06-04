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

export async function PATCH(request, { params }) {
  const auth = await requireMobileToken(request);
  if (auth.error) return auth.error;

  const id = (await params)?.id;
  if (!id) {
    return NextResponse.json({ error: "Missing dispatch id." }, { status: 400 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const action = String(body?.action ?? "").trim().toLowerCase();
  if (action !== "accept" && action !== "decline") {
    return NextResponse.json(
      { error: "action must be accept or decline." },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("respond_mobile_dispatch", {
    p_token: auth.token,
    p_dispatch_id: id,
    p_action: action,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (data?.ok === false) {
    return NextResponse.json(
      { error: data.error ?? "Could not update dispatch alert." },
      { status: 409 }
    );
  }

  return NextResponse.json({
    ok: true,
    dispatchId: data.dispatch_id,
    status: data.status,
  });
}

export async function GET(request, { params }) {
  const auth = await requireMobileToken(request);
  if (auth.error) return auth.error;

  const id = (await params)?.id;
  if (!id) {
    return NextResponse.json({ error: "Missing dispatch id." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: dispatchRow, error: dispatchError } = await admin
    .from("call_response_dispatches")
    .select("*, call_responses(*)")
    .eq("id", id)
    .eq("access_token_id", auth.accessToken.id)
    .maybeSingle();

  if (dispatchError) {
    return NextResponse.json({ error: dispatchError.message }, { status: 500 });
  }

  if (!dispatchRow) {
    return NextResponse.json({ error: "Dispatch alert not found." }, { status: 404 });
  }

  const incident = dispatchRow.call_responses;
  if (!incident || incident.status !== "active") {
    return NextResponse.json({ error: "Incident is no longer active." }, { status: 409 });
  }

  return NextResponse.json({
    ok: true,
    dispatch: {
      id: dispatchRow.id,
      role: dispatchRow.role,
      title: dispatchRow.title,
      message: dispatchRow.message,
      status: dispatchRow.status,
      distanceMeters: dispatchRow.distance_meters,
      createdAt: dispatchRow.created_at,
    },
    incident: {
      id: incident.id,
      latitude: incident.latitude,
      longitude: incident.longitude,
      label: incident.label,
    },
  });
}
