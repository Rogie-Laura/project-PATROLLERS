import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  extractBearerToken,
  normalizePersonnelOnBoard,
  resolveAccessToken,
} from "@/lib/mobile/accessToken";
import { pushLocationSnapshot } from "@/lib/mobile/pushLocationSnapshot";

async function requireAccessToken(request) {
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

function profileResponse(row) {
  return {
    mobile_plate: row?.mobile_plate ?? "",
    mobile_phone: row?.mobile_phone ?? "",
    radio_call_sign: row?.radio_call_sign ?? "",
    office: row?.office ?? "",
    unit: row?.unit ?? "",
    personnel_on_board: normalizePersonnelOnBoard(row?.personnel_on_board),
    patrol_status: row?.patrol_status ?? "",
    patrol_unit_type: row?.patrol_unit_type ?? "",
    updated_at: row?.updated_at ?? null,
  };
}

export async function GET(request) {
  const auth = await requireAccessToken(request);
  if (auth.error) return auth.error;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("mobile_device_profiles")
    .select("*")
    .eq("access_token_id", auth.accessToken.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    profile: profileResponse(data),
  });
}

export async function PUT(request) {
  const auth = await requireAccessToken(request);
  if (auth.error) return auth.error;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const payload = {
    access_token_id: auth.accessToken.id,
    mobile_plate: String(body?.mobile_plate ?? "").trim() || null,
    mobile_phone: String(body?.mobile_phone ?? "").trim() || null,
    radio_call_sign: String(body?.radio_call_sign ?? "").trim() || null,
    office: String(body?.office ?? "").trim() || null,
    unit: String(body?.unit ?? "").trim() || null,
    personnel_on_board: normalizePersonnelOnBoard(body?.personnel_on_board),
    patrol_status: String(body?.patrol_status ?? "").trim() || null,
    patrol_unit_type: String(body?.patrol_unit_type ?? "").trim() || null,
    updated_at: new Date().toISOString(),
  };

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("mobile_device_profiles")
    .upsert(payload, { onConflict: "access_token_id" })
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    profile: profileResponse(data),
  });
}

export async function PATCH(request) {
  const auth = await requireAccessToken(request);
  if (auth.error) return auth.error;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!Object.prototype.hasOwnProperty.call(body, "personnel_on_board")) {
    return NextResponse.json(
      { error: "personnel_on_board is required for this update." },
      { status: 400 }
    );
  }

  const personnel = normalizePersonnelOnBoard(body.personnel_on_board);
  const admin = createAdminClient();
  const updatedAt = new Date().toISOString();

  const { data: profile, error } = await admin
    .from("mobile_device_profiles")
    .update({
      personnel_on_board: personnel,
      updated_at: updatedAt,
    })
    .eq("access_token_id", auth.accessToken.id)
    .select("*")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let row = profile;

  if (!row) {
    const { data: inserted, error: insertError } = await admin
      .from("mobile_device_profiles")
      .insert({
        access_token_id: auth.accessToken.id,
        personnel_on_board: personnel,
        updated_at: updatedAt,
      })
      .select("*")
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    row = inserted;
  }

  try {
    await pushLocationSnapshot(admin, auth.accessToken, row, {
      personnel_on_board: personnel,
    });
  } catch (snapshotError) {
    console.error("personnel snapshot push failed:", snapshotError);
  }

  return NextResponse.json({
    ok: true,
    profile: profileResponse(row),
    synced_location: true,
  });
}
