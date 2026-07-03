import rosarioMpsRings from "@/lib/smartLocator/data/rosario-mps-rings.json";

const norm = (value) => String(value ?? "").trim();

export function unitBoundaryKey(office, unit) {
  const officeKey = norm(office);
  const unitKey = norm(unit);
  if (!officeKey || !unitKey) return null;
  return `${officeKey}|${unitKey}`;
}

/**
 * Station / unit area-of-responsibility outlines for Smart Locator.
 * Coordinates are [latitude, longitude] rings sourced from OpenStreetMap
 * administrative boundaries where noted.
 */
export const UNIT_BOUNDARIES = {
  "Cavite PPO|Rosario MPS": {
    label: "Rosario MPS",
    office: "Cavite PPO",
    unit: "Rosario MPS",
    source: rosarioMpsRings.source,
    rings: rosarioMpsRings.rings,
  },
};

export function getUnitBoundaryRings(entry) {
  if (Array.isArray(entry?.rings) && entry.rings.length > 0) {
    return entry.rings;
  }
  if (Array.isArray(entry?.ring) && entry.ring.length > 0) {
    return [entry.ring];
  }
  return [];
}

export function getUnitBoundary(office, unit) {
  const key = unitBoundaryKey(office, unit);
  if (!key) return null;
  const entry = UNIT_BOUNDARIES[key];
  const rings = getUnitBoundaryRings(entry);
  if (!rings.length) return null;

  return {
    key,
    label: entry.label ?? unit,
    office: entry.office ?? office,
    unit: entry.unit ?? unit,
    source: entry.source ?? null,
    rings,
  };
}

export function boundaryForUser(user) {
  if (!user?.unit) return null;
  return getUnitBoundary(user.office, user.unit);
}
