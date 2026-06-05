/** View menu layer ids and labels (display order). */
export const MAP_VIEW_LAYERS = [
  { id: "legend", label: "Legend" },
  { id: "pnpStations", label: "PNP Stations" },
  { id: "friendlyUnit", label: "Friendly Unit" },
  { id: "crimeEnvironment", label: "Crime Environment" },
  { id: "patrolStatus", label: "Patrol Status" },
  { id: "signalStats", label: "Signal Stats" },
];

export const MAP_VIEW_LAYER_IDS = MAP_VIEW_LAYERS.map((layer) => layer.id);

export function createDefaultMapViewLayers() {
  return Object.fromEntries(MAP_VIEW_LAYER_IDS.map((id) => [id, false]));
}

/** Layers rendered in the top-left map stack (Patrol Status is a separate side panel). */
export const MAP_VIEW_STACK_LAYERS = MAP_VIEW_LAYERS.filter(
  (layer) => layer.id !== "patrolStatus"
);
