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
