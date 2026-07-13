/** Default marker edge at regional view (zoom 9). */
export const SMART_LOCATOR_MARKER_REFERENCE_SIZE_PX = 28;

export const SMART_LOCATOR_CUSTOM_PRESET_ID = "custom";

export const SMART_LOCATOR_MARKER_SIZE_MIN_PX = 10;
export const SMART_LOCATOR_MARKER_SIZE_MAX_PX = 96;

// Keep zoom constants local — do not import lib/mapBounds (Leaflet needs window).
const MAP_MIN_ZOOM = 6;
const MAP_MAX_ZOOM = 19;
const CALABARZON_ZOOM = 9;

/**
 * Marker size presets for Smart Locator.
 * Each built-in preset multiplies the zoom→px anchor table.
 * `custom` uses user-entered sizes per zoom.
 */
export const SMART_LOCATOR_MARKER_SIZE_PRESETS = [
  {
    id: "xs",
    label: "Extra small",
    shortLabel: "XS",
    scale: 0.55,
    description: "Tiny icons — densest map view",
  },
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
  {
    id: SMART_LOCATOR_CUSTOM_PRESET_ID,
    label: "Custom",
    shortLabel: "Custom",
    scale: 1,
    description: "I-type mo ang size (px) sa bawat zoom level",
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

function lerpFromAnchors(zoom, anchors, fallback) {
  const z = Number(zoom);
  if (!Number.isFinite(z)) return fallback;
  if (!anchors?.length) return fallback;

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

  return fallback;
}

function lerpBaseSize(zoom) {
  return lerpFromAnchors(
    zoom,
    SMART_LOCATOR_MARKER_SIZE_ANCHORS,
    SMART_LOCATOR_MARKER_REFERENCE_SIZE_PX
  );
}

export function clampSmartLocatorMarkerSizePx(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return SMART_LOCATOR_MARKER_REFERENCE_SIZE_PX;
  return Math.min(
    SMART_LOCATOR_MARKER_SIZE_MAX_PX,
    Math.max(SMART_LOCATOR_MARKER_SIZE_MIN_PX, Math.round(n))
  );
}

/** Default custom table = Default (M) preset sizes. */
export function createDefaultSmartLocatorCustomSizes() {
  return Object.fromEntries(
    SMART_LOCATOR_MARKER_SIZE_ZOOM_STEPS.map((zoom) => [
      String(zoom),
      Math.max(
        SMART_LOCATOR_MARKER_SIZE_MIN_PX,
        Math.round(lerpBaseSize(zoom))
      ),
    ])
  );
}

export function normalizeSmartLocatorCustomSizes(raw) {
  const defaults = createDefaultSmartLocatorCustomSizes();
  if (!raw || typeof raw !== "object") return defaults;

  const next = { ...defaults };
  for (const zoom of SMART_LOCATOR_MARKER_SIZE_ZOOM_STEPS) {
    const key = String(zoom);
    if (raw[key] != null || raw[zoom] != null) {
      next[key] = clampSmartLocatorMarkerSizePx(raw[key] ?? raw[zoom]);
    }
  }
  return next;
}

function customSizesToAnchors(customSizes) {
  const sizes = normalizeSmartLocatorCustomSizes(customSizes);
  return SMART_LOCATOR_MARKER_SIZE_ZOOM_STEPS.map((zoom) => [
    zoom,
    sizes[String(zoom)],
  ]);
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
 * Built-ins use scale multipliers; Custom uses editable per-zoom sizes.
 */
export function getSmartLocatorMarkerSizePx(
  zoom,
  presetId = DEFAULT_SMART_LOCATOR_MARKER_SIZE_PRESET,
  customSizes = null
) {
  if (presetId === SMART_LOCATOR_CUSTOM_PRESET_ID) {
    return Math.max(
      SMART_LOCATOR_MARKER_SIZE_MIN_PX,
      Math.round(
        lerpFromAnchors(
          zoom,
          customSizesToAnchors(customSizes),
          SMART_LOCATOR_MARKER_REFERENCE_SIZE_PX
        )
      )
    );
  }

  const preset = getSmartLocatorMarkerSizePreset(presetId);
  const base = lerpBaseSize(zoom);
  return Math.max(
    SMART_LOCATOR_MARKER_SIZE_MIN_PX,
    Math.round(base * preset.scale)
  );
}

/** Full zoom→size table for the options panel. */
export function getSmartLocatorMarkerSizeTable(
  presetId = DEFAULT_SMART_LOCATOR_MARKER_SIZE_PRESET,
  customSizes = null
) {
  return SMART_LOCATOR_MARKER_SIZE_ZOOM_STEPS.map((zoom) => ({
    zoom,
    sizePx: getSmartLocatorMarkerSizePx(zoom, presetId, customSizes),
  }));
}

export function normalizeSmartLocatorMarkerSizeSetting(raw) {
  const source =
    raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  const presetId = getSmartLocatorMarkerSizePreset(
    source.presetId ?? source.preset_id
  ).id;
  const customSizes =
    presetId === SMART_LOCATOR_CUSTOM_PRESET_ID
      ? normalizeSmartLocatorCustomSizes(
          source.customSizes ?? source.custom_sizes
        )
      : null;

  return { presetId, customSizes };
}

export function serializeSmartLocatorMarkerSizeSetting(presetId, customSizes) {
  const normalized = normalizeSmartLocatorMarkerSizeSetting({
    presetId,
    customSizes,
  });
  return {
    presetId: normalized.presetId,
    customSizes:
      normalized.presetId === SMART_LOCATOR_CUSTOM_PRESET_ID
        ? normalizeSmartLocatorCustomSizes(normalized.customSizes)
        : null,
  };
}

