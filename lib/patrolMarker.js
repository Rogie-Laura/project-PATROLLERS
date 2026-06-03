import L from "leaflet";
import { getPatrolMarkerColor } from "@/lib/patrolStatusLabels";
import {
  CONNECTION_BORDER_COLOR,
  CONNECTION_STATE,
} from "@/lib/connectionState";

export {
  getPatrolMarkerColor,
  getPatrolStatusLabel,
  PATROL_STATUS,
} from "@/lib/patrolStatusLabels";

export const PATROL_CAR_MARKER_SRC = "/markers/patrol-car.png";

/** ~same footprint as the old 20px dot markers */
const MARKER_SIZE_PX = 26;
const MARKER_BORDER_PX = 3;
const CAR_IMAGE_PX = 14;

export function createPatrolMarkerIcon(
  patrolStatus,
  showPatrolStatus = true,
  connectionState = CONNECTION_STATE.strong
) {
  const fill = showPatrolStatus ? getPatrolMarkerColor(patrolStatus) : "#22c55e";
  const border =
    CONNECTION_BORDER_COLOR[connectionState] ||
    CONNECTION_BORDER_COLOR.strong;
  const isStale = connectionState === CONNECTION_STATE.stale;
  const anchor = MARKER_SIZE_PX / 2;

  return L.divIcon({
    className: "patrol-marker",
    html: `<div class="patrol-marker-pin" style="
      box-sizing: border-box;
      width: ${MARKER_SIZE_PX}px;
      height: ${MARKER_SIZE_PX}px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: ${fill};
      border: ${MARKER_BORDER_PX}px solid ${border};
      border-radius: 50%;
      box-shadow: 0 0 0 1.5px rgba(255,255,255,0.85), 0 2px 8px rgba(0,0,0,0.4);
      opacity: ${isStale ? "0.7" : "1"};
    "><img src="${PATROL_CAR_MARKER_SRC}" alt="" width="${CAR_IMAGE_PX}" height="${CAR_IMAGE_PX}" style="max-width:${CAR_IMAGE_PX}px;max-height:${CAR_IMAGE_PX}px;width:${CAR_IMAGE_PX}px;height:${CAR_IMAGE_PX}px;object-fit:contain;display:block;pointer-events:none;" /></div>`,
    iconSize: [MARKER_SIZE_PX, MARKER_SIZE_PX],
    iconAnchor: [anchor, anchor],
  });
}
