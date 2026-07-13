export const AREA_OF_CONVERGENCE_TYPES = [
  {
    key: "public_park",
    label: "Public Park",
    typeLabel: "Public Park",
    icon: "/smart-locator/icons/public_park.png",
  },
  {
    key: "freedom_park",
    label: "Freedom Park",
    typeLabel: "Freedom Park",
    icon: "/smart-locator/icons/freedom_park.png",
  },
  {
    key: "cemetery",
    label: "Cemetery",
    typeLabel: "Cemetery",
    icon: "/smart-locator/icons/cemetery.png",
  },
  {
    key: "memorial_park",
    label: "Memorial Park",
    typeLabel: "Memorial Park",
    icon: null,
  },
  {
    key: "town_plaza",
    label: "Town Plaza",
    typeLabel: "Town Plaza",
    icon: null,
  },
];

const BY_KEY = Object.fromEntries(
  AREA_OF_CONVERGENCE_TYPES.map((entry) => [entry.key, entry])
);

export function isAreaOfConvergenceCategory(category) {
  return String(category ?? "").trim() === "area_of_convergence";
}

export function getAreaOfConvergenceType(typeKey) {
  return BY_KEY[String(typeKey ?? "").trim()] ?? null;
}

export function normalizeAreaOfConvergenceType(typeKey) {
  return getAreaOfConvergenceType(typeKey);
}

export function createEmptyPersonnelRow() {
  return { rankName: "", contactNumber: "" };
}

export function normalizePersonnelList(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((row) => ({
      rankName: String(row?.rankName ?? row?.rank_name ?? "").trim(),
      contactNumber: String(row?.contactNumber ?? row?.contact_number ?? "").trim(),
    }))
    .filter((row) => row.rankName || row.contactNumber);
}

export function areaOfConvergenceFromRow(row) {
  if (!row) return null;
  const meta = getAreaOfConvergenceType(row.type_key);
  return {
    id: row.id,
    type: row.type ?? meta?.typeLabel ?? "",
    typeKey: row.type_key,
    unit: row.unit ?? "",
    office: row.office ?? "",
    addressLocation: row.address_location ?? "",
    estimatedCrowd: row.estimated_crowd ?? "",
    personnel: normalizePersonnelList(row.personnel),
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    createdBy: row.created_by ?? null,
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? null,
    iconUrl: meta?.icon ?? null,
  };
}
