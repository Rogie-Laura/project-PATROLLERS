export const FRIENDLY_FORCE_TYPES = [
  {
    key: "phil_army",
    label: "Phil Army",
    typeLabel: "Philippine Army",
    icon: null,
  },
  {
    key: "phil_navy",
    label: "Phil Navy",
    typeLabel: "Philippine Navy",
    icon: null,
  },
  {
    key: "phil_airforce",
    label: "Phil Airforce",
    typeLabel: "Philippine Air Force",
    icon: null,
  },
  {
    key: "phil_marines",
    label: "Phil Marines",
    typeLabel: "Philippine Marines",
    icon: null,
  },
  {
    key: "pcg",
    label: "PCG",
    typeLabel: "PCG",
    icon: null,
  },
  {
    key: "bfp",
    label: "BFP",
    typeLabel: "BFP",
    icon: null,
  },
  {
    key: "bjmp",
    label: "BJMP",
    typeLabel: "BJMP",
    icon: null,
  },
];

const BY_KEY = Object.fromEntries(
  FRIENDLY_FORCE_TYPES.map((entry) => [entry.key, entry])
);

export function isFriendlyForceCategory(category) {
  return String(category ?? "").trim() === "friendly_units";
}

export function getFriendlyForceType(typeKey) {
  return BY_KEY[String(typeKey ?? "").trim()] ?? null;
}

export function normalizeFriendlyForceType(typeKey) {
  return getFriendlyForceType(typeKey);
}

export function friendlyForceFromRow(row) {
  if (!row) return null;
  const meta = getFriendlyForceType(row.type_key);
  return {
    id: row.id,
    type: row.type ?? meta?.typeLabel ?? "",
    typeKey: row.type_key,
    unit: row.unit ?? "",
    office: row.office ?? "",
    commandingOfficer: row.commanding_officer ?? "",
    contactNumber: row.contact_number ?? "",
    addressLocation: row.address_location ?? "",
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    createdBy: row.created_by ?? null,
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? null,
    iconUrl: meta?.icon ?? null,
  };
}
