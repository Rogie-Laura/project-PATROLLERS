import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { ADMIN_ROLES } from "@/lib/mobile/adminRoles";
import {
  DIRECTIONS_PROVIDER,
  formatIntervalLabel,
  getSystemSettings,
  isGoogleMapsConfigured,
  MAX_LOCATION_INTERVAL_SECONDS,
  MIN_LOCATION_INTERVAL_SECONDS,
  normalizeDirectionsProvider,
  parseIntervalInput,
  updateDirectionsProvider,
  updateIncidentRadiusRings,
  updateLocationIntervalSeconds,
} from "@/lib/mobile/systemSettings";
import { formatRadiusRingsSummary } from "@/lib/incidentRadiusRings";

function requireAdmin(user) {
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (!ADMIN_ROLES.has(user.role)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }
  return null;
}

function settingsPayload(settings) {
  const seconds = Math.round(settings.location_interval_seconds);
  const directionsProvider = normalizeDirectionsProvider(
    settings.directions_provider
  );

  return {
    location_interval_seconds: seconds,
    location_interval_minutes: Math.max(1, Math.ceil(seconds / 60)),
    interval_label: formatIntervalLabel(seconds),
    min_seconds: MIN_LOCATION_INTERVAL_SECONDS,
    max_seconds: MAX_LOCATION_INTERVAL_SECONDS,
    directions_provider: directionsProvider,
    google_maps_configured: isGoogleMapsConfigured(),
    incident_radius_rings: settings.incident_radius_rings,
    incident_radius_summary: formatRadiusRingsSummary(
      settings.incident_radius_rings
    ),
  };
}

export async function GET() {
  const user = await getCurrentUser();
  const denied = requireAdmin(user);
  if (denied) return denied;

  const settings = await getSystemSettings();

  return NextResponse.json({
    ok: true,
    settings: settingsPayload(settings),
  });
}

export async function PATCH(request) {
  const user = await getCurrentUser();
  const denied = requireAdmin(user);
  if (denied) return denied;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const hasInterval =
    body?.location_interval_seconds != null ||
    body?.value != null ||
    body?.unit != null;
  const hasDirections = body?.directions_provider != null;
  const hasRadiusRings = body?.incident_radius_rings != null;

  if (!hasInterval && !hasDirections && !hasRadiusRings) {
    return NextResponse.json(
      { error: "No settings to update." },
      { status: 400 }
    );
  }

  if (hasInterval) {
    let seconds;

    if (body?.location_interval_seconds != null) {
      const direct = parseIntervalInput(body.location_interval_seconds, "seconds");
      if (direct.error) {
        return NextResponse.json({ error: direct.error }, { status: 400 });
      }
      seconds = direct.seconds;
    } else {
      const unit = body?.unit === "minutes" ? "minutes" : "seconds";
      const parsed = parseIntervalInput(body?.value, unit);
      if (parsed.error) {
        return NextResponse.json({ error: parsed.error }, { status: 400 });
      }
      seconds = parsed.seconds;
    }

    try {
      await updateLocationIntervalSeconds(seconds, user.id);
    } catch (error) {
      return NextResponse.json(
        { error: error.message ?? "Could not save interval." },
        { status: 500 }
      );
    }
  }

  if (hasDirections) {
    const provider = normalizeDirectionsProvider(body.directions_provider);
    if (!Object.values(DIRECTIONS_PROVIDER).includes(provider)) {
      return NextResponse.json(
        { error: "Invalid directions provider." },
        { status: 400 }
      );
    }

    if (provider === DIRECTIONS_PROVIDER.google && !isGoogleMapsConfigured()) {
      return NextResponse.json(
        {
          error:
            "Google Directions requires GOOGLE_MAPS_API_KEY in Vercel environment variables.",
        },
        { status: 400 }
      );
    }

    try {
      await updateDirectionsProvider(provider, user.id);
    } catch (error) {
      return NextResponse.json(
        { error: error.message ?? "Could not save directions provider." },
        { status: 500 }
      );
    }
  }

  if (hasRadiusRings) {
    try {
      await updateIncidentRadiusRings(body.incident_radius_rings, user.id);
    } catch (error) {
      return NextResponse.json(
        { error: error.message ?? "Could not save radius circles." },
        { status: 400 }
      );
    }
  }

  const saved = await getSystemSettings();

  return NextResponse.json({
    ok: true,
    settings: settingsPayload(saved),
  });
}
