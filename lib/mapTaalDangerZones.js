/** Taal Volcano main crater — PHIVOLCS reference point for km danger rings. */
export const TAAL_MAIN_CRATER = {
  latitude: 14.0099,
  longitude: 120.9964,
  label: "Taal Main Crater",
};

/**
 * Concentric danger-zone rings (km) shown on PHIVOLCS Taal hazard materials.
 * Radii are ground distance from the main crater.
 */
export const TAAL_DANGER_ZONE_RINGS = [
  {
    id: "pdz4",
    radiusKm: 4,
    label: "4 km",
    description: "Permanent Danger Zone radius (4 km from main crater).",
    color: "#dc2626",
    fillOpacity: 0.12,
  },
  {
    id: "dz7",
    radiusKm: 7,
    label: "7 km",
    description: "Extended danger zone (7 km) used during Taal unrest/evacuation advisories.",
    color: "#ea580c",
    fillOpacity: 0.08,
  },
  {
    id: "dz14",
    radiusKm: 14,
    label: "14 km",
    description: "Outer high-risk zone (14 km) during heightened alert levels.",
    color: "#ca8a04",
    fillOpacity: 0.06,
  },
];
