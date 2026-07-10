/** CALABARZON hydromet hazard overlays (Project NOAH / PAGASA). */

export const STORM_SURGE_OVERLAY = {
  id: "stormSurge",
  label: "Storm Surge Hazard",
  description:
    "Storm Surge Advisory zones SSA 1–4 (Project NOAH) for CALABARZON coastal areas.",
  source: "Project NOAH / PAGASA",
  geojsonPath: "/map-overlays/calabarzon/storm-surge.geojson",
};

export const STORM_SURGE_STYLES = {
  1: { color: "#38bdf8", fillOpacity: 0.16, label: "SSA 1" },
  2: { color: "#2563eb", fillOpacity: 0.2, label: "SSA 2" },
  3: { color: "#ea580c", fillOpacity: 0.24, label: "SSA 3" },
  4: { color: "#b91c1c", fillOpacity: 0.28, label: "SSA 4" },
};
