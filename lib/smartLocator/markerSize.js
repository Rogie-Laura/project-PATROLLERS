import {
  CALABARZON_ZOOM,
  MAP_MAX_ZOOM,
  MAP_MIN_ZOOM,
} from "@/lib/mapBounds";

/** Default marker edge at regional view (zoom 9). */
export const SMART_LOCATOR_MARKER_REFERENCE_SIZE_PX = 28;

/**
 * Marker size presets for Smart Locator.
 * Each preset multiplies the zoom→px anchor table.
 */
export const SMART_LOCATOR_MARKER_SIZE_PRESETS = [
  {
    id: "compact",
    label: "Compact",
    shortLabel: "S",
    scale: 0.75,
    description: "Smaller icons — less map clutter",
  },
  {
    id: "default",
    label: "Default",
    shortLabel: "M",
    scale: 1,
    description: "Balanced size across zoom levels",
  },
  {
    id: "large",
    label: "Large",
    shortLabel: "L",
    scale: 1.25,
    description: "Easier to tap and read",
  },
  {
    id: "xl",
    label: "Extra large",
    shortLabel: "XL",
    scale: 1.5,
    description: "Maximum visibility on the map",
  },
];

export const DEFAULT_SMART_LOCATOR_MARKER_SIZE_PRESET = "default";

/**
 * Base [zoom, marker edge px] anchors (Default preset, scale 1).
 * Zoom out → smaller; zoom in → larger.
 */
const SMART_LOCATOR_MARKER_SIZE_ANCHORS = [
  [MAP_MIN_ZOOM, 18], // zoom 6
  [7, 20],
  [8, 24],
  [CALABARZON_ZOOM, SMART_LOCATOR_MARKER_REFERENCE_SIZE_PX], // zoom 9 → 28
  [11, 32],
  [13, 36],
  [15, 40],
  [17, 44],
  [MAP_MAX_ZOOM, 48], // zoom 19
];

/** Zoom levels shown in the options panel table. */
export const SMART_LOCATOR_MARKER_SIZE_ZOOM_STEPS = [
  6, 7, 8, 9, 11, 13, 15, 17, 19,
];

function lerpBaseSize(zoom) {
  const z = Number(zoom);
  if (!Number.isFinite(z)) return SMART_LOCATOR_MARKER_REFERENCE_SIZE_PX;

  const anchors = SMART_LOCATOR_MARKER_SIZE_ANCHORS;
  if (z <= anchors[0][0]) return anchors[0][1];
  const last = anchors[anchors.length - 1];
  if (z >= last[0]) return last[1];

  for (let i = 0; i < anchors.length - 1; i++) {
    const [z0, s0] = anchors[i];
    const [z1, s1] = anchors[i + 1];
    if (z >= z0 && z <= z1) {
      const t = (z - z0) / (z1 - z0);
      return s0 + t * (s1 - s0);
    }
  }

  return SMART_LOCATOR_MARKER_REFERENCE_SIZE_PX;
}

export function getSmartLocatorMarkerSizePreset(presetId) {
  return (
    SMART_LOCATOR_MARKER_SIZE_PRESETS.find((preset) => preset.id === presetId) ??
    SMART_LOCATOR_MARKER_SIZE_PRESETS.find(
      (preset) => preset.id === DEFAULT_SMART_LOCATOR_MARKER_SIZE_PRESET
    )
  );
}

/**
 * Marker px for a zoom level and size preset.
 * Compact 0.75× · Default 1× · Large 1.25× · XL 1.5×
 */
export function getSmartLocatorMarkerSizePx(
  zoom,
  presetId = DEFAULT_SMART_LOCATOR_MARKER_SIZE_PRESET
) {
  const preset = getSmartLocatorMarkerSizePreset(presetId);
  const base = lerpBaseSize(zoom);
  return Math.max(12, Math.round(base * preset.scale));
}

/** Full zoom→size table for the options panel. */
export function getSmartLocatorMarkerSizeTable(
  presetId = DEFAULT_SMART_LOCATOR_MARKER_SIZE_PRESET
) {
  return SMART_LOCATOR_MARKER_SIZE_ZOOM_STEPS.map((zoom) => ({
    zoom,
    sizePx: getSmartLocatorMarkerSizePx(zoom, presetId),
  }));
}
