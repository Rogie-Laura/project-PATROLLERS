import { distanceMeters, formatDistanceKm, zoneForDistanceMeters } from "@/lib/geo";

export const DISPATCH_MAX_RADIUS_M = 6000;
/** ~35 km/h average for urban emergency response estimate */
const ESTIMATED_SPEED_MPS = 35 / 3.6;

export function getUnitLabel(location) {
  return (
    location.patrol_name ||
    location.mobile_plate ||
    location.radio_call_sign ||
    location.unit ||
    "Mobile unit"
  );
}

export function getUnitKey(location) {
  return location.access_token_id || location.user_id || location.id;
}

export function rankNearbyUnits(incident, locations) {
  const incidentLat = Number(incident.latitude);
  const incidentLon = Number(incident.longitude);

  return locations
    .map((location) => {
      const lat = Number(location.latitude);
      const lon = Number(location.longitude);
      const dist = distanceMeters(incidentLat, incidentLon, lat, lon);

      return {
        key: getUnitKey(location),
        location,
        label: getUnitLabel(location),
        distanceMeters: dist,
        distanceLabel: formatDistanceKm(dist),
        zone: zoneForDistanceMeters(dist),
        inCoverage: dist <= DISPATCH_MAX_RADIUS_M,
        etaMinutesEstimate: Math.max(
          1,
          Math.ceil(dist / ESTIMATED_SPEED_MPS / 60)
        ),
      };
    })
    .filter((unit) => unit.inCoverage)
    .sort((a, b) => a.distanceMeters - b.distanceMeters);
}

export function formatEtaMinutes(durationSeconds) {
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    return "—";
  }
  const minutes = Math.max(1, Math.ceil(durationSeconds / 60));
  return `~${minutes} min`;
}

export function createCallResponse(place) {
  return {
    id:
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `cr-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    latitude: place.latitude,
    longitude: place.longitude,
    label: place.displayName,
    createdAt: new Date().toISOString(),
  };
}
