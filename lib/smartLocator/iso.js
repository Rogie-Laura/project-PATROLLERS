export const ISO_TYPES = [
  {
    key: "white_area",
    label: "White Area",
    typeLabel: "White Area",
    icon: "/smart-locator/icons/white_area.png",
  },
  {
    key: "red_area",
    label: "Red Area",
    typeLabel: "Red Area",
    icon: "/smart-locator/icons/red_area.png",
  },
  {
    key: "gidas",
    label: "GIDAS",
    typeLabel: "GIDAS",
    icon: "/smart-locator/icons/GIDAS.png",
  },
];

const BY_KEY = Object.fromEntries(ISO_TYPES.map((entry) => [entry.key, entry]));

export function isIsoCategory(category) {
  return String(category ?? "").trim() === "iso";
}

export function getIsoType(typeKey) {
  return BY_KEY[String(typeKey ?? "").trim()] ?? null;
}

export function normalizeIsoType(typeKey) {
  return getIsoType(typeKey);
}

export function isoFromRow(row) {
  if (!row) return null;
  const meta = getIsoType(row.type_key);
  return {
    id: row.id,
    type: row.type ?? meta?.typeLabel ?? "",
    typeKey: row.type_key,
    unit: row.unit ?? "",
    office: row.office ?? "",
    addressLocation: row.address_location ?? "",
    remarks: row.remarks ?? "",
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    createdBy: row.created_by ?? null,
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? null,
    iconUrl: meta?.icon ?? null,
  };
}
