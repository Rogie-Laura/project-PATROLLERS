const norm = (value) => String(value ?? "").trim();

export function unitBoundaryKey(office, unit) {
  const officeKey = norm(office);
  const unitKey = norm(unit);
  if (!officeKey || !unitKey) return null;
  return `${officeKey}|${unitKey}`;
}

/**
 * Station / unit area-of-responsibility outlines for Smart Locator.
 * Replace ring coordinates with official GIS boundaries when available.
 */
export const UNIT_BOUNDARIES = {
  "Cavite PPO|Rosario MPS": {
    label: "Rosario MPS",
    office: "Cavite PPO",
    unit: "Rosario MPS",
    ring: [
      [14.462, 120.835],
      [14.458, 120.875],
      [14.442, 120.902],
      [14.41, 120.895],
      [14.385, 120.86],
      [14.39, 120.825],
      [14.42, 120.815],
      [14.45, 120.822],
    ],
  },
};

export function getUnitBoundary(office, unit) {
  const key = unitBoundaryKey(office, unit);
  if (!key) return null;
  const entry = UNIT_BOUNDARIES[key];
  if (!entry?.ring?.length) return null;

  return {
    key,
    label: entry.label ?? unit,
    office: entry.office ?? office,
    unit: entry.unit ?? unit,
    ring: entry.ring,
  };
}

export function boundaryForUser(user) {
  if (!user?.unit) return null;
  return getUnitBoundary(user.office, user.unit);
}
