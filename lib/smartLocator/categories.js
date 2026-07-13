function item(key, label) {
  return { key, label };
}

export const SMART_LOCATOR_MENU = [
  {
    key: "pnp_establishments",
    label: "PNP Establishments",
    color: "#7c3aed",
    items: [
      item("police_station", "Police Stations"),
      item("sub_station_pcp", "Sub-Station/PCP"),
      item("pac", "Police Assistance Center"),
      item("sscp", "SSCP"),
      item("bcp", "BCP"),
    ],
  },
  {
    key: "friendly_units",
    label: "Friendly Units",
    color: "#2563eb",
    items: [
      item("phil_army", "Philippine Army"),
      item("phil_navy", "Philippine Navy"),
      item("phil_airforce", "Philippine Air Force"),
      item("phil_marines", "Philippine Marines"),
      item("pcg", "PCG"),
      item("bfp", "BFP"),
      item("bjmp", "BJMP"),
    ],
  },
  {
    key: "iso",
    label: "ISO",
    color: "#dc2626",
    items: [
      item("white_area", "White Area"),
      item("red_area", "Red Area"),
      item("gidas", "GIDAS"),
    ],
  },
  {
    key: "area_of_convergence",
    label: "Area of Convergence",
    color: "#059669",
    items: [
      item("public_park", "Public Park"),
      item("freedom_park", "Freedom Park"),
      item("cemetery", "Cemetery"),
      item("memorial_park", "Memorial Park"),
      item("town_plaza", "Town Plaza"),
    ],
  },
  {
    key: "educational_institutions",
    label: "Educational institutions",
    color: "#0891b2",
    items: [
      item("daycares", "Daycares"),
      item("elementary_schools", "Elementary schools"),
      item("high_schools", "High schools"),
      item("colleges", "Colleges"),
      item("universities", "Universities"),
    ],
  },
  {
    key: "government_offices",
    label: "Government offices",
    color: "#0d9488",
    items: [
      item("national_offices", "National offices"),
      item("provincial_offices", "Provincial offices"),
      item("city_municipal_offices", "City / municipal offices"),
      item("barangay_offices", "Barangay offices"),
    ],
  },
  {
    key: "healthcare_facilities",
    label: "Healthcare facilities",
    color: "#e11d48",
    items: [
      item("hospitals", "Hospitals"),
      item("infirmaries", "Infirmaries"),
      item("rhus", "RHUs"),
      item("dialysis_centers", "Dialysis centers"),
    ],
  },
  {
    key: "places_of_worship",
    label: "Places of worship",
    color: "#9333ea",
    items: [
      item("churches", "Churches"),
      item("mosques", "Mosques"),
      item("temples", "Temples"),
    ],
  },
  {
    key: "transportation_hubs",
    label: "Transportation hubs",
    color: "#ea580c",
    items: [
      item("airports", "Airports"),
      item("seaports", "Seaports"),
      item("bus_terminals", "Bus terminals"),
      item("jeepney_terminals", "Jeepney terminals"),
      item("railway_stations", "Railway stations"),
      item("helipad", "Helipad"),
    ],
  },
  {
    key: "vital_installations",
    label: "Vital installations",
    color: "#b91c1c",
    items: [
      item("power_plants", "Power plants"),
      item("substations", "Substations"),
      item("water_facilities", "Water facilities"),
      item("telecom_towers", "Telecommunications towers"),
      item("data_centers", "Data centers"),
      item("fuel_depots", "Fuel depots"),
    ],
  },
  {
    key: "financial_institutions",
    label: "Financial institutions",
    color: "#ca8a04",
    items: [
      item("banks", "Banks"),
      item("pawnshops", "Pawnshops"),
      item("money_service_businesses", "Money service businesses"),
      item("atms", "ATMs"),
    ],
  },
  {
    key: "commercial_establishments",
    label: "Commercial establishments",
    color: "#1d4ed8",
    items: [
      item("malls", "Malls"),
      item("public_markets", "Public markets"),
      item("supermarkets", "Supermarkets"),
      item("business_districts", "Business districts"),
    ],
  },
  {
    key: "industrial_areas",
    label: "Industrial areas",
    color: "#64748b",
    items: [
      item("factories", "Factories"),
      item("warehouses", "Warehouses"),
      item("peza_economic_zones", "PEZA / economic zones"),
      item("logistics_hubs", "Logistics hubs"),
    ],
  },
  {
    key: "tourist_destinations",
    label: "Tourist destinations",
    color: "#0f766e",
    items: [
      item("hotels_resorts", "Hotels and resorts"),
      item("resort_beach", "Resort beach"),
      item("heritage_sites", "Heritage sites"),
      item("accommodation_establishments", "Accommodation establishments"),
    ],
  },
  {
    key: "support_safe_zones",
    label: "Support and Safe Zones",
    color: "#16a34a",
    items: [
      item("evacuation_centers", "Evacuation centers"),
      item("designated_shelters", "Designated shelters"),
      item("auto_repair_shops", "Auto repair shops"),
    ],
  },
  {
    key: "high_density_communities",
    label: "High-density communities",
    color: "#b45309",
    items: [
      item("subdivisions", "Subdivisions"),
      item("relocation_sites", "Relocation sites"),
      item("informal_settlements", "Informal settlements"),
    ],
  },
  {
    key: "communication_assets",
    label: "Communication assets",
    color: "#4f46e5",
    items: [
      item("radio_repeater_sites", "Radio repeater sites"),
      item("command_centers", "Command centers"),
      item("cctv_networks", "CCTV networks"),
    ],
  },
  {
    key: "disaster_prone_areas",
    label: "Disaster-prone areas",
    color: "#ef4444",
    items: [
      item("flood_zones", "Flood zones"),
      item("landslide_zones", "Landslide zones"),
      item("volcanic_zones", "Volcanic zones"),
      item("coastal_zones", "Coastal zones"),
      item("fault_line_zones", "Fault-line zones"),
    ],
  },
  {
    key: "large_event_venues",
    label: "Large event venues",
    color: "#db2777",
    items: [
      item("stadiums", "Stadiums"),
      item("convention_centers", "Convention centers"),
      item("arenas", "Arenas"),
      item("mass_gathering_sites", "Other mass gathering sites"),
    ],
  },
  {
    key: "leisure_amusement",
    label: "Leisure and amusement center",
    color: "#a855f7",
    items: [
      item("casino", "Casino"),
      item("cockpit", "Cockpit"),
    ],
  },
];

const MENU_BY_KEY = Object.fromEntries(SMART_LOCATOR_MENU.map((group) => [group.key, group]));

const SUBCATEGORY_INDEX = SMART_LOCATOR_MENU.reduce((acc, group) => {
  for (const entry of group.items) {
    acc[`${group.key}:${entry.key}`] = { group, entry };
  }
  return acc;
}, {});

export function getSmartLocatorGroup(categoryKey) {
  return MENU_BY_KEY[categoryKey] ?? null;
}

export function getSmartLocatorCategoryColor(categoryKey) {
  return getSmartLocatorGroup(categoryKey)?.color ?? "#64748b";
}

export function normalizeSmartLocatorSelection(category, subcategory) {
  const categoryKey = String(category ?? "").trim();
  const subcategoryKey = String(subcategory ?? "").trim();
  const match = SUBCATEGORY_INDEX[`${categoryKey}:${subcategoryKey}`];
  if (!match) return null;

  return {
    category: categoryKey,
    subcategory: subcategoryKey,
  };
}

export function smartLocatorPlotLabel(category, subcategory) {
  const match = SUBCATEGORY_INDEX[`${category}:${subcategory}`];
  if (!match) return "Unknown";
  return `${match.group.label} — ${match.entry.label}`;
}

export function smartLocatorSubcategoryLabel(category, subcategory) {
  const match = SUBCATEGORY_INDEX[`${category}:${subcategory}`];
  return match?.entry.label ?? subcategory ?? "Unknown";
}
