import { buildPatrolLabel, normalizePersonnelOnBoard } from "@/lib/mobile/accessToken";

export async function pushLocationSnapshot(admin, accessToken, profile, overrides = {}) {
  const { data: lastLoc } = await admin
    .from("location_updates")
    .select("*")
    .eq("access_token_id", accessToken.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!lastLoc) return null;

  const personnel = normalizePersonnelOnBoard(
    overrides.personnel_on_board ?? profile?.personnel_on_board
  );

  const { data, error } = await admin
    .from("location_updates")
    .insert({
      access_token_id: accessToken.id,
      latitude: lastLoc.latitude,
      longitude: lastLoc.longitude,
      accuracy: lastLoc.accuracy,
      patrol_name: buildPatrolLabel(profile),
      badge_number: profile?.mobile_plate ?? accessToken.label ?? "MOBILE",
      mobile_plate: profile?.mobile_plate ?? null,
      mobile_phone: profile?.mobile_phone ?? null,
      radio_call_sign: profile?.radio_call_sign ?? null,
      office: profile?.office ?? null,
      unit: profile?.unit ?? null,
      personnel_on_board: personnel,
      patrol_status: lastLoc.patrol_status ?? profile?.patrol_status ?? null,
      patrol_unit_type: profile?.patrol_unit_type ?? lastLoc.patrol_unit_type ?? null,
      battery_level: lastLoc.battery_level ?? null,
      signal_label: lastLoc.signal_label ?? null,
      signal_level: lastLoc.signal_level ?? null,
      tracking_active: lastLoc.tracking_active !== false,
    })
    .select("id, created_at")
    .single();

  if (error) throw error;
  return data;
}
