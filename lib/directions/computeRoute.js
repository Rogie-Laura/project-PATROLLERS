import { decodeGooglePolyline } from "@/lib/googlePolyline";
import { stripHtml } from "@/lib/formatRoute";
import {
  DIRECTIONS_PROVIDER,
  getDirectionsProvider,
  isGoogleMapsConfigured,
} from "@/lib/mobile/systemSettings";

const OSRM_BASE = "https://router.project-osrm.org/route/v1/driving";

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
      "Route follows OpenStreetMap roads. No live traffic data — ETA is based on road distance and speed limits.",
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
    const err = new Error(data.error_message || "Google Directions failed");
    err.googleStatus = data.status;
    err.googleMessage = data.error_message || null;
    throw err;
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

/**
 * Compute a driving route between two coordinates. Used by the web monitor
 * and mobile dispatch navigation (server-side only — no session required).
 */
export async function computeDrivingRoute(fromLat, fromLon, toLat, toLon) {
  const googleKey = process.env.GOOGLE_MAPS_API_KEY?.trim();
  const preferredProvider = await getDirectionsProvider();
  const useGoogle =
    preferredProvider === DIRECTIONS_PROVIDER.google &&
    isGoogleMapsConfigured();

  try {
    return useGoogle
      ? await fetchGoogleRoute(fromLat, fromLon, toLat, toLon, googleKey)
      : await fetchOsrmRoute(fromLat, fromLon, toLat, toLon);
  } catch (err) {
    if (useGoogle) {
      try {
        const fallback = await fetchOsrmRoute(fromLat, fromLon, toLat, toLon);
        const googleHint = err?.googleMessage || err?.message;
        const trafficNote = googleHint
          ? `Google routing failed (${googleHint}). Showing OSRM route without live traffic.`
          : "Google routing failed; showing road route without live traffic.";
        return {
          ...fallback,
          trafficNote,
        };
      } catch {
        /* continue */
      }
    }

    throw err;
  }
}
