import L from "leaflet";

export const INCIDENT_RADIUS_RINGS = [
  { radiusMeters: 6000, color: "#eab308", fillOpacity: 0.04, weight: 1.5 },
  { radiusMeters: 3000, color: "#f97316", fillOpacity: 0.07, weight: 2 },
  { radiusMeters: 1000, color: "#ef4444", fillOpacity: 0.12, weight: 2 },
];

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
