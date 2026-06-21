import { NextResponse } from "next/server";
import {
  extractBearerToken,
  normalizePersonnelOnBoard,
  resolveAccessToken,
} from "@/lib/mobile/accessToken";
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

  return { accessToken };
}

export async function POST(request) {
  const auth = await requireMobileToken(request);
  if (auth.error) return auth.error;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const locationLabel = String(body?.location_label ?? body?.location ?? "").trim();
  const personReference = String(
    body?.person_reference ?? body?.point_of_contact ?? ""
  ).trim();
  const latitude = Number(body?.latitude);
  const longitude = Number(body?.longitude);
  const recordedAtRaw = String(body?.recorded_at ?? "").trim();
  const recordedAt = recordedAtRaw ? new Date(recordedAtRaw) : new Date();

  if (!locationLabel) {
    return NextResponse.json(
      { error: "Location is required." },
      { status: 400 }
    );
  }

  if (!personReference) {
    return NextResponse.json(
      { error: "Point of contact is required." },
      { status: 400 }
    );
  }

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return NextResponse.json(
      { error: "Valid latitude and longitude are required." },
      { status: 400 }
    );
  }

  if (Number.isNaN(recordedAt.getTime())) {
    return NextResponse.json(
      { error: "Invalid recorded_at timestamp." },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("mobile_device_profiles")
    .select("office, unit, mobile_plate, radio_call_sign, personnel_on_board")
    .eq("access_token_id", auth.accessToken.id)
    .maybeSingle();

  const personnel = normalizePersonnelOnBoard(
    body?.personnel_on_board ?? profile?.personnel_on_board
  ).filter((person) => person.on_duty !== false);

  const { data, error } = await admin
    .from("establishment_visitations")
    .insert({
      access_token_id: auth.accessToken.id,
      office: String(body?.office ?? profile?.office ?? "").trim() || null,
      unit: String(body?.unit ?? profile?.unit ?? "").trim() || null,
      mobile_plate:
        String(body?.mobile_plate ?? profile?.mobile_plate ?? "").trim() || null,
      radio_call_sign:
        String(body?.radio_call_sign ?? profile?.radio_call_sign ?? "").trim() ||
        null,
      personnel_on_board: personnel,
      location_label: locationLabel,
      person_reference: personReference,
      latitude,
      longitude,
      recorded_at: recordedAt.toISOString(),
    })
    .select("id, recorded_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    visitation: {
      id: data.id,
      recorded_at: data.recorded_at,
    },
  });
}
