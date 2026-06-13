import L from "leaflet";
import {
  CALABARZON_ZOOM,
  MAP_MAX_ZOOM,
  MAP_MIN_ZOOM,
} from "@/lib/mapBounds";
import { CONNECTION_STATE } from "@/lib/connectionState";
import { getPatrolUnitTypeMarkerSrc } from "@/lib/patrolUnitTypes";

export {
  getPatrolMarkerColor,
  getPatrolStatusLabel,
  PATROL_STATUS,
} from "@/lib/patrolStatusLabels";

export const PATROL_CAR_MARKER_SRC = "/markers/patrol-car.png";

/** Peak marker at middle map view (zoom 9). */
export const PATROL_MARKER_PEAK_SIZE_PX = 28;
export const PATROL_MARKER_REFERENCE_ZOOM = CALABARZON_ZOOM;

/** [zoom, marker edge px] — linear blend between consecutive anchors. */
const PATROL_MARKER_SIZE_ANCHORS = [
  [MAP_MIN_ZOOM, 14],
  [7, 18],
  [8, 22],
  [CALABARZON_ZOOM, PATROL_MARKER_PEAK_SIZE_PX],
  [12, 26],
  [14, 24],
  [MAP_MAX_ZOOM, 22],
];

function lerpMarkerSize(zoom) {
  const z = Number(zoom);
  if (!Number.isFinite(z)) return PATROL_MARKER_PEAK_SIZE_PX;

  const anchors = PATROL_MARKER_SIZE_ANCHORS;
  if (z <= anchors[0][0]) return anchors[0][1];
  const last = anchors[anchors.length - 1];
  if (z >= last[0]) return last[1];

  for (let i = 0; i < anchors.length - 1; i++) {
    const [z0, s0] = anchors[i];
    const [z1, s1] = anchors[i + 1];
    if (z >= z0 && z <= z1) {
      const t = (z - z0) / (z1 - z0);
      return Math.round(s0 + t * (s1 - s0));
    }
  }

  return PATROL_MARKER_PEAK_SIZE_PX;
}

/**
 * Marker px by zoom: 6→12, 7→16, 8→20, 9→26 (peak), 12→24, 14→22, 19→20.
 */
export function getPatrolMarkerSizePx(zoom) {
  return lerpMarkerSize(zoom);
}

/** @deprecated Use getPatrolMarkerSizePx — scale relative to peak size. */
export function getPatrolMarkerZoomScale(zoom) {
  return getPatrolMarkerSizePx(zoom) / PATROL_MARKER_PEAK_SIZE_PX;
}

export function createPatrolMarkerIcon(
  _patrolStatus,
  _showPatrolStatus = true,
  connectionState = CONNECTION_STATE.strong,
  markerSizePx = PATROL_MARKER_PEAK_SIZE_PX,
  patrolUnitType = null
) {
  const isStale = connectionState === CONNECTION_STATE.stale;
  const size =
    Number.isFinite(markerSizePx) && markerSizePx > 0
      ? Math.round(markerSizePx)
      : PATROL_MARKER_PEAK_SIZE_PX;
  const sizePx = size;
  const markerSrc = getPatrolUnitTypeMarkerSrc(patrolUnitType);
  const anchor = sizePx / 2;
  const markerOpacity = isStale ? "0.55" : "1";

  return L.divIcon({
    className: "patrol-marker",
    html: `<img src="${markerSrc}" alt="" class="patrol-marker-pin" width="${sizePx}" height="${sizePx}" style="width:${sizePx}px;height:${sizePx}px;object-fit:contain;display:block;pointer-events:none;opacity:${markerOpacity};" />`,
    iconSize: [sizePx, sizePx],
    iconAnchor: [anchor, anchor],
  });
}
