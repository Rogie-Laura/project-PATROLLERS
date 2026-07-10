/** CALABARZON hydromet hazard overlays (Project NOAH / PAGASA). */

export const CALABARZON_PROVINCES = [
  "cavite",
  "batangas",
  "laguna",
  "rizal",
  "quezon",
];

export const FLOOD_PRONE_OVERLAY = {
  id: "floodProne",
  label: "Flood Prone",
  description:
    "100-year flood hazard (medium & high) for CALABARZON from Project NOAH.",
  source: "Project NOAH / PAGASA",
  provincePaths: CALABARZON_PROVINCES.map(
    (province) => `/map-overlays/calabarzon/flood-prone/${province}.geojson`,
  ),
};

export const STORM_SURGE_OVERLAY = {
  id: "stormSurge",
  label: "Storm Surge Hazard",
  description:
    "Storm Surge Advisory zones SSA 1–4 (Project NOAH) for CALABARZON coastal areas.",
  source: "Project NOAH / PAGASA",
  geojsonPath: "/map-overlays/calabarzon/storm-surge.geojson",
};

export const FLOOD_LEVEL_STYLES = {
  1: { color: "#0284c7", fillOpacity: 0.18, label: "Low" },
  2: { color: "#d97706", fillOpacity: 0.22, label: "Medium" },
  3: { color: "#dc2626", fillOpacity: 0.26, label: "High" },
};

export const STORM_SURGE_STYLES = {
  1: { color: "#38bdf8", fillOpacity: 0.16, label: "SSA 1" },
  2: { color: "#2563eb", fillOpacity: 0.2, label: "SSA 2" },
  3: { color: "#ea580c", fillOpacity: 0.24, label: "SSA 3" },
  4: { color: "#b91c1c", fillOpacity: 0.28, label: "SSA 4" },
};
