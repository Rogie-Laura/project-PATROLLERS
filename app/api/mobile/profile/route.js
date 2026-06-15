import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  extractBearerToken,
  normalizePersonnelOnBoard,
  resolveAccessToken,
} from "@/lib/mobile/accessToken";
import {
  normalizeDutyShifts,
  normalizeVisibilityPoints,
} from "@/lib/mobile/dutyDetail";
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
    duty_shifts: normalizeDutyShifts(row?.duty_shifts),
    visibility_points: normalizeVisibilityPoints(row?.visibility_points),
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
    duty_shifts: normalizeDutyShifts(body?.duty_shifts),
    visibility_points: normalizeVisibilityPoints(body?.visibility_points),
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

  const hasPersonnel = Object.prototype.hasOwnProperty.call(
    body,
    "personnel_on_board"
  );
  const hasDutyShifts = Object.prototype.hasOwnProperty.call(body, "duty_shifts");
  const hasVisibilityPoints = Object.prototype.hasOwnProperty.call(
    body,
    "visibility_points"
  );

  if (!hasPersonnel && !hasDutyShifts && !hasVisibilityPoints) {
    return NextResponse.json(
      {
        error:
          "At least one of personnel_on_board, duty_shifts, or visibility_points is required.",
      },
      { status: 400 }
    );
  }

  const patch = { updated_at: new Date().toISOString() };
  if (hasPersonnel) {
    patch.personnel_on_board = normalizePersonnelOnBoard(body.personnel_on_board);
  }
  if (hasDutyShifts) {
    patch.duty_shifts = normalizeDutyShifts(body.duty_shifts);
  }
  if (hasVisibilityPoints) {
    patch.visibility_points = normalizeVisibilityPoints(body.visibility_points);
  }

  const admin = createAdminClient();
  const { data: profile, error } = await admin
    .from("mobile_device_profiles")
    .update(patch)
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
        ...patch,
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
      personnel_on_board: row.personnel_on_board,
      duty_shifts: row.duty_shifts,
      visibility_points: row.visibility_points,
    });
  } catch (snapshotError) {
    console.error("duty detail snapshot push failed:", snapshotError);
  }

  return NextResponse.json({
    ok: true,
    profile: profileResponse(row),
    synced_location: true,
  });
}
