export const SMART_LOCATOR_CATEGORIES = {
  vital_installation: {
    key: "vital_installation",
    label: "Vital installation",
    shortLabel: "Vital",
    color: "#dc2626",
  },
  business_establishment: {
    key: "business_establishment",
    label: "Business establishment",
    shortLabel: "Business",
    color: "#2563eb",
  },
  government_office: {
    key: "government_office",
    label: "Government office",
    shortLabel: "Government",
    color: "#059669",
  },
  pnp_installation: {
    key: "pnp_installation",
    label: "PNP installation",
    shortLabel: "PNP",
    color: "#7c3aed",
  },
  other: {
    key: "other",
    label: "Other",
    shortLabel: "Other",
    color: "#64748b",
  },
};

export const SMART_LOCATOR_CATEGORY_LIST = Object.values(SMART_LOCATOR_CATEGORIES);

export function normalizeSmartLocatorCategory(value) {
  const key = String(value ?? "").trim();
  if (SMART_LOCATOR_CATEGORIES[key]) return key;
  return null;
}

export function smartLocatorCategoryLabel(key) {
  return SMART_LOCATOR_CATEGORIES[key]?.label ?? key ?? "Unknown";
}
