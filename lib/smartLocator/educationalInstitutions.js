export const EDUCATIONAL_INSTITUTION_TYPES = [
  {
    key: "daycares",
    label: "Daycares",
    typeLabel: "Daycare",
    icon: "/smart-locator/icons/daycare.png",
  },
  {
    key: "elementary_schools",
    label: "Elementary schools",
    typeLabel: "Elementary School",
    icon: "/smart-locator/icons/elementary.png",
  },
  {
    key: "high_schools",
    label: "High schools",
    typeLabel: "High School",
    icon: "/smart-locator/icons/secondary.png",
  },
  {
    key: "colleges",
    label: "Colleges",
    typeLabel: "College",
    icon: "/smart-locator/icons/college.png",
  },
  {
    key: "universities",
    label: "Universities",
    typeLabel: "University",
    icon: "/smart-locator/icons/universities.png",
  },
];

const BY_KEY = Object.fromEntries(
  EDUCATIONAL_INSTITUTION_TYPES.map((entry) => [entry.key, entry])
);

export function isEducationalInstitutionCategory(category) {
  return String(category ?? "").trim() === "educational_institutions";
}

export function getEducationalInstitutionType(typeKey) {
  return BY_KEY[String(typeKey ?? "").trim()] ?? null;
}

export function normalizeEducationalInstitutionType(typeKey) {
  return getEducationalInstitutionType(typeKey);
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

export function educationalInstitutionFromRow(row) {
  if (!row) return null;
  const meta = getEducationalInstitutionType(row.type_key);
  const isPollingCenter = Boolean(row.is_polling_center);
  return {
    id: row.id,
    type: row.type ?? meta?.typeLabel ?? "",
    typeKey: row.type_key,
    unit: row.unit ?? "",
    office: row.office ?? "",
    schoolName: row.school_name ?? "",
    principalSupervisor: row.principal_supervisor ?? "",
    contactNumber: row.contact_number ?? "",
    addressLocation: row.address_location ?? "",
    estimatedStudents: row.estimated_students ?? "",
    isPollingCenter,
    numberOfVoters: isPollingCenter ? (row.number_of_voters ?? "") : "",
    personnel: isPollingCenter ? normalizePersonnelList(row.personnel) : [],
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    createdBy: row.created_by ?? null,
    createdAt: row.created_at ?? null,
    updatedAt: row.updated_at ?? null,
    iconUrl: meta?.icon ?? null,
  };
}
