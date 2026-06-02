import L from "leaflet";
import { getPatrolMarkerColor } from "@/lib/patrolStatusLabels";

export {
  getPatrolMarkerColor,
  getPatrolStatusLabel,
  PATROL_STATUS,
} from "@/lib/patrolStatusLabels";

export function createPatrolMarkerIcon(patrolStatus, showPatrolStatus = true) {
  const color = showPatrolStatus
    ? getPatrolMarkerColor(patrolStatus)
    : "#22c55e";

  return L.divIcon({
    className: "patrol-marker",
    html: `<div style="
      width: 18px;
      height: 18px;
      background: ${color};
      border: 3px solid #fff;
      border-radius: 50%;
      box-shadow: 0 2px 8px rgba(0,0,0,0.4);
    "></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}
