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

  return L.divIcon({
    className: "patrol-marker",
    html: `<div style="
      width: 20px;
      height: 20px;
      background: ${fill};
      border: 4px solid ${border};
      border-radius: 50%;
      box-shadow: 0 0 0 1.5px rgba(255,255,255,0.85), 0 2px 8px rgba(0,0,0,0.4);
      opacity: ${isStale ? "0.7" : "1"};
    "></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
}
