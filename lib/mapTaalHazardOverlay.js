/** Taal Volcano hazard overlay layers (PHIVOLCS Batangas provincial maps, Jan 2020 series). */

export const TAAL_HAZARD_OVERLAY_NONE = "none";

export const TAAL_HAZARD_LAYER_OPTIONS = [
  {
    id: TAAL_HAZARD_OVERLAY_NONE,
    label: "None",
    description: "Hide Taal volcano hazard overlays.",
    color: null,
    geojsonPath: null,
  },
  {
    id: "baseSurge",
    label: "Base Surge",
    description: "Taal Volcano base surge hazard zones (PHIVOLCS pyroclastic density current map).",
    color: "#dc2626",
    geojsonPath: "/map-overlays/taal/base-surge.geojson",
  },
  {
    id: "volcanicTsunami",
    label: "Volcanic Tsunami",
    description: "Taal Volcano volcanic tsunami hazard zones around Taal Lake.",
    color: "#2563eb",
    geojsonPath: "/map-overlays/taal/volcanic-tsunami.geojson",
  },
  {
    id: "fissure",
    label: "Fissuring",
    description: "Taal Volcano ground fissuring hazard zones.",
    color: "#9333ea",
    geojsonPath: "/map-overlays/taal/fissure.geojson",
  },
  {
    id: "ballisticProjectile",
    label: "Ballistic Projectiles",
    description: "Taal Volcano ballistic projectile reach zones.",
    color: "#ea580c",
    geojsonPath: "/map-overlays/taal/ballistic-projectile.geojson",
  },
  {
    id: "lahar",
    label: "Lahar",
    description: "Taal Volcano lahar flow hazard zones.",
    color: "#854d0e",
    geojsonPath: "/map-overlays/taal/lahar.geojson",
  },
];

export function normalizeTaalHazardLayerIds(value) {
  if (!Array.isArray(value)) return [];
  const allowed = new Set(TAAL_HAZARD_LAYER_OPTIONS.map((option) => option.id));
  return value.filter((id) => allowed.has(id) && id !== TAAL_HAZARD_OVERLAY_NONE);
}

export function getTaalHazardLayerOption(id) {
  return TAAL_HAZARD_LAYER_OPTIONS.find((option) => option.id === id) ?? null;
}
