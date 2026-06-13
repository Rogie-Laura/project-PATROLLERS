import L from "leaflet";
import {
  CALABARZON_ZOOM,
  MAP_MAX_ZOOM,
  MAP_MIN_ZOOM,
} from "@/lib/mapBounds";
import { getPatrolMarkerColor, PATROL_STATUS } from "@/lib/patrolStatusLabels";
import {
  CONNECTION_BORDER_COLOR,
  CONNECTION_STATE,
} from "@/lib/connectionState";
import { getPatrolUnitTypeMarkerSrc } from "@/lib/patrolUnitTypes";

export {
  getPatrolMarkerColor,
  getPatrolStatusLabel,
  PATROL_STATUS,
} from "@/lib/patrolStatusLabels";

export const PATROL_CAR_MARKER_SRC = "/markers/patrol-car.png";

/** Peak marker at middle map view (zoom 9). */
export const PATROL_MARKER_PEAK_SIZE_PX = 26;
export const PATROL_MARKER_REFERENCE_ZOOM = CALABARZON_ZOOM;

const PEAK_BORDER_PX = 3;
const PEAK_CAR_PX = 20;

/** [zoom, marker diameter px] — linear blend between consecutive anchors. */
const PATROL_MARKER_SIZE_ANCHORS = [
  [MAP_MIN_ZOOM, 12],
  [7, 16],
  [8, 20],
  [CALABARZON_ZOOM, PATROL_MARKER_PEAK_SIZE_PX],
  [12, 24],
  [14, 22],
  [MAP_MAX_ZOOM, 20],
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

function dimensionsForMarkerSize(sizePx) {
  const peak = PATROL_MARKER_PEAK_SIZE_PX;
  const ratio = sizePx / peak;

  return {
    sizePx,
    borderPx:
      sizePx <= 8 ? 1 : Math.max(1, Math.round(PEAK_BORDER_PX * ratio)),
    carPx: Math.max(4, Math.round(PEAK_CAR_PX * ratio)),
  };
}

export function createPatrolMarkerIcon(
  patrolStatus,
  showPatrolStatus = true,
  connectionState = CONNECTION_STATE.strong,
  markerSizePx = PATROL_MARKER_PEAK_SIZE_PX,
  patrolUnitType = null
) {
  // Units on incident response always show red, regardless of the
  // patrol-status display toggle. Other statuses only get their color when
  // the toggle is on; otherwise they fall back to the default green.
  const fill =
    patrolStatus === PATROL_STATUS.incidentResponse
      ? "#ef4444"
      : showPatrolStatus
        ? getPatrolMarkerColor(patrolStatus)
        : "#22c55e";
  const borderColor =
    CONNECTION_BORDER_COLOR[connectionState] ||
    CONNECTION_BORDER_COLOR.strong;
  const isStale = connectionState === CONNECTION_STATE.stale;
  const size =
    Number.isFinite(markerSizePx) && markerSizePx > 0
      ? Math.round(markerSizePx)
      : PATROL_MARKER_PEAK_SIZE_PX;
  const { sizePx, borderPx, carPx } = dimensionsForMarkerSize(size);
  const markerSrc = getPatrolUnitTypeMarkerSrc(patrolUnitType);
  const anchor = sizePx / 2;
  const ringBorderPx = isStale
    ? borderPx
    : Math.max(borderPx + 1, 3);
  const ringShadow = isStale
    ? "0 0 0 1.5px rgba(255,255,255,0.75), 0 2px 6px rgba(0,0,0,0.35)"
    : connectionState === CONNECTION_STATE.strong
      ? "0 0 0 2px rgba(255,255,255,0.9), 0 0 0 4px rgba(59,130,246,0.85), 0 2px 8px rgba(0,0,0,0.4)"
      : connectionState === CONNECTION_STATE.weak
        ? "0 0 0 2px rgba(255,255,255,0.9), 0 0 0 4px rgba(245,158,11,0.8), 0 2px 8px rgba(0,0,0,0.4)"
        : "0 0 0 2px rgba(255,255,255,0.9), 0 0 0 4px rgba(234,179,8,0.75), 0 2px 8px rgba(0,0,0,0.4)";
  const markerOpacity = isStale ? "0.72" : "1";

  return L.divIcon({
    className: "patrol-marker",
    html: `<div class="patrol-marker-pin" style="
      box-sizing: border-box;
      width: ${sizePx}px;
      height: ${sizePx}px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: ${fill};
      border: ${ringBorderPx}px solid ${borderColor};
      border-radius: 50%;
      box-shadow: ${ringShadow};
      opacity: ${markerOpacity};
    "><img src="${markerSrc}" alt="" width="${carPx}" height="${carPx}" style="max-width:${carPx}px;max-height:${carPx}px;width:${carPx}px;height:${carPx}px;object-fit:contain;display:block;pointer-events:none;" /></div>`,
    iconSize: [sizePx, sizePx],
    iconAnchor: [anchor, anchor],
  });
}
