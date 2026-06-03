export const MAX_INCIDENT_RADIUS_CIRCLES = 5;
export const MIN_RADIUS_KM = 0.1;
export const MAX_RADIUS_KM = 100;

/** Default matches the original 1 / 3 / 6 km rings. */
export const DEFAULT_RADIUS_RING_SLOTS = [
  { enabled: true, radiusKm: 1, color: "#ef4444" },
  { enabled: true, radiusKm: 3, color: "#f97316" },
  { enabled: true, radiusKm: 6, color: "#eab308" },
  { enabled: false, radiusKm: 10, color: "#3b82f6" },
  { enabled: false, radiusKm: 12, color: "#8b5cf6" },
];

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

function clampRadiusKm(value) {
  const km = Number(value);
  if (!Number.isFinite(km)) return MIN_RADIUS_KM;
  return Math.min(MAX_RADIUS_KM, Math.max(MIN_RADIUS_KM, Math.round(km * 10) / 10));
}

function normalizeColor(value, fallback) {
  const raw = String(value ?? "").trim();
  return HEX_COLOR.test(raw) ? raw.toLowerCase() : fallback;
}

export function createDefaultRadiusRingSlots() {
  return DEFAULT_RADIUS_RING_SLOTS.map((slot) => ({ ...slot }));
}

/** Always returns exactly five slots for the settings editor. */
export function normalizeRadiusRingSlots(input) {
  const list = Array.isArray(input) ? input : [];
  const defaults = createDefaultRadiusRingSlots();

  return defaults.map((fallback, index) => {
    const row = list[index] ?? {};
    const enabled = Boolean(row.enabled);
    return {
      enabled,
      radiusKm: enabled
        ? clampRadiusKm(row.radiusKm ?? row.radius_km ?? fallback.radiusKm)
        : clampRadiusKm(row.radiusKm ?? row.radius_km ?? fallback.radiusKm),
      color: normalizeColor(row.color, fallback.color),
    };
  });
}

export function parseRadiusRingSlotsInput(input) {
  const normalized = normalizeRadiusRingSlots(input);
  const enabled = normalized.filter((slot) => slot.enabled);

  if (enabled.length === 0) {
    return { error: "Enable at least one response radius circle." };
  }

  const radii = enabled.map((slot) => slot.radiusKm);
  if (new Set(radii).size !== radii.length) {
    return { error: "Each enabled circle must have a different distance." };
  }

  return { slots: normalized };
}

/** Largest enabled radius in meters (for dispatch unit filtering). */
export function maxEnabledRadiusMeters(slots) {
  const enabled = normalizeRadiusRingSlots(slots).filter((s) => s.enabled);
  if (enabled.length === 0) return 6000;
  return Math.max(...enabled.map((s) => s.radiusKm * 1000));
}

/** Leaflet circle layers — largest ring first. */
export function radiusSlotsToMapRings(slots) {
  const enabled = normalizeRadiusRingSlots(slots)
    .filter((slot) => slot.enabled)
    .sort((a, b) => b.radiusKm - a.radiusKm);

  const count = enabled.length;

  return enabled.map((slot, index) => {
    const innerness = count <= 1 ? 1 : 1 - index / (count - 1);
    return {
      radiusMeters: Math.round(slot.radiusKm * 1000),
      radiusKm: slot.radiusKm,
      color: slot.color,
      fillOpacity: 0.04 + innerness * 0.1,
      weight: 1.5 + innerness * 0.5,
    };
  });
}

export function formatRadiusRingsSummary(slots) {
  const enabled = normalizeRadiusRingSlots(slots)
    .filter((s) => s.enabled)
    .sort((a, b) => a.radiusKm - b.radiusKm);

  if (enabled.length === 0) return "No circles enabled";
  return enabled.map((s) => `${s.radiusKm} km`).join(", ");
}
