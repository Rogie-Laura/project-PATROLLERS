import L from "leaflet";

export const PATROL_STATUS = {
  policeVisibility: "police_visibility",
  incidentResponse: "incident_response",
};

export function getPatrolMarkerColor(patrolStatus) {
  if (patrolStatus === PATROL_STATUS.incidentResponse) {
    return "#ef4444";
  }
  return "#22c55e";
}

export function getPatrolStatusLabel(patrolStatus) {
  if (patrolStatus === PATROL_STATUS.incidentResponse) {
    return "On Incident Response";
  }
  if (patrolStatus === PATROL_STATUS.policeVisibility) {
    return "Police Visibility";
  }
  return patrolStatus ? String(patrolStatus) : "Police Visibility";
}

export function createPatrolMarkerIcon(patrolStatus) {
  const color = getPatrolMarkerColor(patrolStatus);

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
