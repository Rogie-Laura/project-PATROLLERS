import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth/session";
import { parseLocationPayload } from "@/lib/location/parseCoordinates";

export async function POST(request) {
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json(
      {
        error:
          "Unauthorized. Log in first and send Authorization: Bearer <token> from the mobile app.",
      },
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

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("location_updates")
    .insert({
      user_id: user.id,
      latitude,
      longitude,
      accuracy,
      patrol_name: user.rank_fullname || user.full_name || "Patrol",
      badge_number: user.badge_number,
    })
    .select("id, latitude, longitude, accuracy, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    location: {
      id: data.id,
      latitude: data.latitude,
      longitude: data.longitude,
      accuracy: data.accuracy,
      recorded_at: data.created_at,
    },
  });
}
