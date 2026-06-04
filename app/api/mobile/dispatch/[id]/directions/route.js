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

export async function POST(request, { params }) {
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

  const fromLat = Number(body?.latitude);
  const fromLon = Number(body?.longitude);

  if (!Number.isFinite(fromLat) || !Number.isFinite(fromLon)) {
    return NextResponse.json(
      { error: "latitude and longitude are required." },
      { status: 400 }
    );
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
  if (!incident) {
    return NextResponse.json({ error: "Incident not found." }, { status: 404 });
  }

  const origin = new URL(request.url).origin;
  const directionsRes = await fetch(`${origin}/api/route/directions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fromLat,
      fromLon,
      toLat: incident.latitude,
      toLon: incident.longitude,
    }),
    cache: "no-store",
  });

  const directions = await directionsRes.json();
  if (!directionsRes.ok) {
    return NextResponse.json(
      { error: directions.error ?? "Could not compute route." },
      { status: directionsRes.status }
    );
  }

  return NextResponse.json({
    ok: true,
    incident: {
      id: incident.id,
      latitude: incident.latitude,
      longitude: incident.longitude,
      label: incident.label,
    },
    route: directions,
  });
}
