import { NextResponse } from "next/server";
import { decodeGooglePolyline } from "@/lib/googlePolyline";
import { stripHtml } from "@/lib/formatRoute";

const OSRM_BASE = "https://router.project-osrm.org/route/v1/driving";

export const dynamic = "force-dynamic";

function osrmManeuverLabel(step) {
  const m = step.maneuver || {};
  const type = m.type || "continue";
  const modifier = m.modifier ? ` ${m.modifier}` : "";
  const street = step.name ? ` onto ${step.name}` : "";
  return `${type}${modifier}${street}`.trim();
}

async function fetchOsrmRoute(fromLat, fromLon, toLat, toLon) {
  const url = `${OSRM_BASE}/${fromLon},${fromLat};${toLon},${toLat}?steps=true&overview=full&geometries=geojson&annotations=true`;
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "PATROLLERS-Monitoring/1.0 (dispatch routing)",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("OSRM unavailable");
  }

  const data = await response.json();
  const route = data?.routes?.[0];
  const leg = route?.legs?.[0];

  if (data?.code !== "Ok" || !route || !leg) {
    throw new Error("No route found");
  }

  const coordinates = (route.geometry?.coordinates ?? []).map(([lon, lat]) => [
    lat,
    lon,
  ]);

  const steps = (leg.steps ?? []).map((step) => ({
    instruction: osrmManeuverLabel(step),
    distanceMeters: step.distance,
    durationSeconds: step.duration,
  }));

  return {
    provider: "osrm",
    hasTraffic: false,
    distanceMeters: route.distance,
    durationSeconds: route.duration,
    durationInTrafficSeconds: route.duration,
    coordinates,
    steps,
    trafficNote:
      "Route follows roads (no live traffic layer). Add GOOGLE_MAPS_API_KEY in Vercel for Google traffic ETA.",
  };
}

async function fetchGoogleRoute(fromLat, fromLon, toLat, toLon, apiKey) {
  const url = new URL("https://maps.googleapis.com/maps/api/directions/json");
  url.searchParams.set("origin", `${fromLat},${fromLon}`);
  url.searchParams.set("destination", `${toLat},${toLon}`);
  url.searchParams.set("departure_time", "now");
  url.searchParams.set("traffic_model", "best_guess");
  url.searchParams.set("key", apiKey);

  const response = await fetch(url.toString(), { cache: "no-store" });
  const data = await response.json();

  if (data.status !== "OK" || !data.routes?.[0]) {
    throw new Error(data.error_message || "Google Directions failed");
  }

  const route = data.routes[0];
  const leg = route.legs[0];
  const coordinates = decodeGooglePolyline(route.overview_polyline?.points);

  const steps = (leg.steps ?? []).map((step) => ({
    instruction: stripHtml(step.html_instructions),
    distanceMeters: step.distance?.value,
    durationSeconds: step.duration?.value,
  }));

  const durationSeconds = leg.duration?.value ?? 0;
  const durationInTrafficSeconds =
    leg.duration_in_traffic?.value ?? durationSeconds;

  const delayMinutes = Math.max(
    0,
    Math.ceil((durationInTrafficSeconds - durationSeconds) / 60)
  );

  return {
    provider: "google",
    hasTraffic: true,
    distanceMeters: leg.distance?.value ?? 0,
    durationSeconds,
    durationInTrafficSeconds,
    delayMinutes,
    coordinates,
    steps,
    trafficNote:
      delayMinutes > 0
        ? `Traffic adds ~${delayMinutes} min vs clear roads.`
        : "Light traffic on this route.",
  };
}

export async function POST(request) {
  let body;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const fromLat = Number(body?.fromLat);
  const fromLon = Number(body?.fromLon);
  const toLat = Number(body?.toLat);
  const toLon = Number(body?.toLon);

  if (![fromLat, fromLon, toLat, toLon].every((n) => Number.isFinite(n))) {
    return NextResponse.json(
      { error: "fromLat, fromLon, toLat, toLon are required" },
      { status: 400 }
    );
  }

  const googleKey = process.env.GOOGLE_MAPS_API_KEY?.trim();

  try {
    const result = googleKey
      ? await fetchGoogleRoute(fromLat, fromLon, toLat, toLon, googleKey)
      : await fetchOsrmRoute(fromLat, fromLon, toLat, toLon);

    return NextResponse.json(result);
  } catch (err) {
    if (googleKey) {
      try {
        const fallback = await fetchOsrmRoute(fromLat, fromLon, toLat, toLon);
        return NextResponse.json({
          ...fallback,
          trafficNote: "Google routing failed; showing road route without live traffic.",
        });
      } catch {
        /* continue */
      }
    }

    return NextResponse.json(
      { error: err?.message || "Routing failed" },
      { status: 502 }
    );
  }
}
