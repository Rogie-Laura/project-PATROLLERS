/** OpenCelliD Philippines (MCC 515) carrier + radio layer definitions. */

export const OPENCELLID_ATTRIBUTION =
  'Cell tower data © <a href="https://opencellid.org/" target="_blank" rel="noopener noreferrer">OpenCelliD</a> (CC BY-SA 4.0). Approximate coverage — not official telco maps.';

export const PH_MCC = 515;

/** Mobile Network Codes in OpenCelliD exports (integer or zero-padded string). */
export const PH_CARRIERS = {
  globe: { mnc: [2, "02"], label: "Globe", color: "#0ea5e9" },
  smart: { mnc: [3, "03"], label: "Smart", color: "#22c55e" },
  dito: { mnc: [66, "66"], label: "DITO", color: "#f97316" },
};

export const CELL_COVERAGE_LAYERS = [
  {
    id: "globeLte",
    carrier: "globe",
    radio: "LTE",
    label: "Globe 4G (LTE)",
    file: "/coverage/globe-lte.json",
    heat: { radius: 22, blur: 14, max: 0.55, gradient: { 0.2: "#0c4a6e", 0.5: "#0ea5e9", 1: "#7dd3fc" } },
  },
  {
    id: "globeNr",
    carrier: "globe",
    radio: "NR",
    label: "Globe 5G (NR)",
    file: "/coverage/globe-nr.json",
    heat: { radius: 18, blur: 12, max: 0.65, gradient: { 0.2: "#164e63", 0.5: "#06b6d4", 1: "#a5f3fc" } },
  },
  {
    id: "smartLte",
    carrier: "smart",
    radio: "LTE",
    label: "Smart 4G (LTE)",
    file: "/coverage/smart-lte.json",
    heat: { radius: 22, blur: 14, max: 0.55, gradient: { 0.2: "#14532d", 0.5: "#22c55e", 1: "#86efac" } },
  },
  {
    id: "smartNr",
    carrier: "smart",
    radio: "NR",
    label: "Smart 5G (NR)",
    file: "/coverage/smart-nr.json",
    heat: { radius: 18, blur: 12, max: 0.65, gradient: { 0.2: "#166534", 0.5: "#4ade80", 1: "#bbf7d0" } },
  },
];

export const CELL_COVERAGE_LAYER_IDS = CELL_COVERAGE_LAYERS.map((layer) => layer.id);

export function createDefaultCellCoverageLayers() {
  return Object.fromEntries(CELL_COVERAGE_LAYER_IDS.map((id) => [id, false]));
}

export function getCellCoverageLayerById(id) {
  return CELL_COVERAGE_LAYERS.find((layer) => layer.id === id) ?? null;
}
