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

function shortStatusLabel(patrolStatus) {
  if (patrolStatus === PATROL_STATUS.incidentResponse) return "Incident";
  return "Visibility";
}

export function createPatrolMarkerIcon(patrolStatus, showPatrolStatus = true) {
  const color = showPatrolStatus
    ? getPatrolMarkerColor(patrolStatus)
    : "#22c55e";

  if (!showPatrolStatus) {
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

  const label = shortStatusLabel(patrolStatus);
  const labelColor =
    patrolStatus === PATROL_STATUS.incidentResponse ? "#fca5a5" : "#86efac";

  return L.divIcon({
    className: "patrol-marker",
    html: `<div style="
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
      pointer-events: none;
    ">
      <div style="
        width: 18px;
        height: 18px;
        background: ${color};
        border: 3px solid #fff;
        border-radius: 50%;
        box-shadow: 0 2px 8px rgba(0,0,0,0.4);
      "></div>
      <span style="
        font-size: 9px;
        font-weight: 600;
        line-height: 1;
        color: ${labelColor};
        background: rgba(0,0,0,0.72);
        padding: 2px 4px;
        border-radius: 4px;
        white-space: nowrap;
      ">${label}</span>
    </div>`,
    iconSize: [56, 36],
    iconAnchor: [28, 9],
  });
}
