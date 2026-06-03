import L from "leaflet";
import {
  createDefaultRadiusRingSlots,
  radiusSlotsToMapRings,
} from "@/lib/incidentRadiusRings";

/** Default rings (1 / 3 / 6 km) — use radiusSlotsToMapRings for saved settings. */
export const INCIDENT_RADIUS_RINGS = radiusSlotsToMapRings(
  createDefaultRadiusRingSlots()
);

export { radiusSlotsToMapRings } from "@/lib/incidentRadiusRings";

export function createIncidentMarkerIcon() {
  return L.divIcon({
    className: "incident-marker",
    html: `<div style="
      width: 24px;
      height: 24px;
      background: #dc2626;
      border: 3px solid #fff;
      border-radius: 50%;
      box-shadow: 0 2px 12px rgba(220,38,38,0.6);
    "></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}
