import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth/session";

export async function POST(request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { error: "Session expired or signed in on another device. Please log in again." },
      { status: 401 }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const latitude = Number(body?.latitude);
  const longitude = Number(body?.longitude);
  const accuracy =
    body?.accuracy === null || body?.accuracy === undefined
      ? null
      : Number(body.accuracy);

  if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
    return NextResponse.json({ error: "Invalid coordinates." }, { status: 400 });
  }

  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return NextResponse.json({ error: "Coordinates out of range." }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin.from("location_updates").insert({
    user_id: user.id,
    latitude,
    longitude,
    accuracy,
    patrol_name: user.rank_fullname || user.full_name || "Patrol",
    badge_number: user.badge_number,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
