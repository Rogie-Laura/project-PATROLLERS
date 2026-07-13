export const PNP_ESTABLISHMENT_TYPES = [
  {
    key: "police_station",
    label: "Police Stations",
    typeLabel: "Police Station",
    icon: "/smart-locator/icons/police_station.png",
  },
  {
    key: "sub_station_pcp",
    label: "Sub-Station/PCP",
    typeLabel: "Sub-Station/PCP",
    icon: "/smart-locator/icons/sub-station.png",
  },
  {
    key: "pac",
    label: "Police Assistance Center",
    typeLabel: "Police Assistance Center",
    icon: "/smart-locator/icons/PAC.png",
  },
  {
    key: "sscp",
    label: "SSCP",
    typeLabel: "SSCP",
    icon: "/smart-locator/icons/SSCP.png",
  },
  {
    key: "bcp",
    label: "BCP",
    typeLabel: "BCP",
    icon: "/smart-locator/icons/BCP.png",
  },
];

const BY_KEY = Object.fromEntries(
  PNP_ESTABLISHMENT_TYPES.map((entry) => [entry.key, entry])
);

export function isPnpEstablishmentCategory(category) {
  return String(category ?? "").trim() === "pnp_establishments";
}

export function getPnpEstablishmentType(typeKey) {
  return BY_KEY[String(typeKey ?? "").trim()] ?? null;
}

export function normalizePnpEstablishmentType(typeKey) {
  return getPnpEstablishmentType(typeKey);
}

export function pnpEstablishmentFromRow(row) {
  if (!row) return null;
  const meta = getPnpEstablishmentType(row.type_key);
  return {
    id: row.id,
    type: row.type ?? meta?.typeLabel ?? "",
    typeKey: row.type_key,
    unit: row.unit ?? "",
    office: row.office ?? "",
    stationToc: row.station_toc ?? "",
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    createdBy: row.created_by ?? null,
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? null,
    iconUrl: meta?.icon ?? null,
  };
}
