/**
 * Legacy fallback: mobile apps should call Supabase RPC `insert_mobile_location`
 * directly (see supabase/migrations/015_insert_mobile_location_rpc.sql).
 */
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  buildPatrolLabel,
  extractBearerToken,
  normalizePersonnelOnBoard,
  resolveAccessToken,
} from "@/lib/mobile/accessToken";
import { getLocationIntervalSeconds } from "@/lib/mobile/systemSettings";
import { parseLocationPayload } from "@/lib/location/parseCoordinates";

export async function POST(request) {
  const bearer = extractBearerToken(request);
  if (!bearer) {
    return NextResponse.json(
      { error: "Missing access token. Send Authorization: Bearer <token>." },
      { status: 401 }
    );
  }

  const accessToken = await resolveAccessToken(bearer);
  if (!accessToken) {
    return NextResponse.json(
      { error: "Invalid or inactive access token." },
      { status: 401 }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = parseLocationPayload(body);
  if (parsed.error) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const { latitude, longitude, accuracy } = parsed;
  const patrolStatus = String(body?.status ?? "").trim() || null;
  const batteryRaw = body?.battery_level ?? body?.batteryLevel;
  const batteryLevel =
    batteryRaw != null && !Number.isNaN(Number(batteryRaw))
      ? Math.min(100, Math.max(0, Math.round(Number(batteryRaw))))
      : null;
  const signalLabel =
    String(body?.signal_label ?? body?.signalLabel ?? "").trim() || null;
  const signalLevelRaw = String(
    body?.signal_level ?? body?.signalLevel ?? ""
  )
    .trim()
    .toLowerCase();
  const signalLevel = ["strong", "weak", "none"].includes(signalLevelRaw)
    ? signalLevelRaw
    : null;
  const trackingActiveRaw = body?.tracking_active ?? body?.trackingActive;
  const trackingActive = trackingActiveRaw === false ? false : true;
  const admin = createAdminClient();

  const { data: profile } = await admin
    .from("mobile_device_profiles")
    .select("*")
    .eq("access_token_id", accessToken.id)
    .maybeSingle();

  const patrolName = buildPatrolLabel(profile);

  const { data, error } = await admin
    .from("location_updates")
    .insert({
      access_token_id: accessToken.id,
      latitude,
      longitude,
      accuracy,
      patrol_name: patrolName,
      badge_number: profile?.mobile_plate ?? accessToken.label ?? "MOBILE",
      mobile_plate: profile?.mobile_plate ?? null,
      mobile_phone: profile?.mobile_phone ?? null,
      radio_call_sign: profile?.radio_call_sign ?? null,
      office: profile?.office ?? null,
      unit: profile?.unit ?? null,
      personnel_on_board: normalizePersonnelOnBoard(profile?.personnel_on_board),
      patrol_status: patrolStatus,
      battery_level: batteryLevel,
      signal_label: signalLabel,
      signal_level: signalLevel,
      tracking_active: trackingActive,
    })
    .select("id, latitude, longitude, accuracy, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (patrolStatus) {
    await admin
      .from("mobile_device_profiles")
      .update({ patrol_status: patrolStatus })
      .eq("access_token_id", accessToken.id);
  }

  const intervalSeconds = await getLocationIntervalSeconds();

  return NextResponse.json({
    ok: true,
    interval_seconds: intervalSeconds,
    interval_minutes: Math.max(1, Math.ceil(intervalSeconds / 60)),
    location: {
      id: data.id,
      latitude: data.latitude,
      longitude: data.longitude,
      accuracy: data.accuracy,
      recorded_at: data.created_at,
    },
  });
}
