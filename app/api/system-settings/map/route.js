import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { maxEnabledRadiusMeters } from "@/lib/incidentRadiusRings";
import { getSystemSettings } from "@/lib/mobile/systemSettings";

/** Map-facing settings for any signed-in monitoring center user. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const settings = await getSystemSettings();

  return NextResponse.json({
    ok: true,
    location_interval_seconds: settings.location_interval_seconds,
    incident_radius_rings: settings.incident_radius_rings,
    dispatch_max_radius_m: maxEnabledRadiusMeters(settings.incident_radius_rings),
  });
}
