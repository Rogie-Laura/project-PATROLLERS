export const PATROL_STATUS = {
  policeVisibility: "police_visibility",
  incidentResponse: "incident_response",
  establishmentVisitation: "establishment_visitation",
  bisitaAlpha: "bisita_alpha",
  oplanSita: "oplan_sita",
  policeResponse: "police_response",
};

const INTERVENTION_STATUSES = new Set([
  PATROL_STATUS.establishmentVisitation,
  PATROL_STATUS.bisitaAlpha,
  PATROL_STATUS.oplanSita,
  PATROL_STATUS.policeResponse,
]);

export function getPatrolMarkerColor(patrolStatus) {
  if (patrolStatus === PATROL_STATUS.incidentResponse) {
    return "#ef4444";
  }
  if (INTERVENTION_STATUSES.has(patrolStatus)) {
    return "#f59e0b";
  }
  return "#22c55e";
}

const STATUS_LABELS = {
  [PATROL_STATUS.policeVisibility]: "Police Visibility",
  [PATROL_STATUS.incidentResponse]: "On Incident Response",
  [PATROL_STATUS.establishmentVisitation]: "Establishment Visitation",
  [PATROL_STATUS.bisitaAlpha]: "Bisita Alpha",
  [PATROL_STATUS.oplanSita]: "Oplan Sita",
  [PATROL_STATUS.policeResponse]: "Police Response",
};

export function getPatrolStatusLabel(patrolStatus) {
  if (patrolStatus && STATUS_LABELS[patrolStatus]) {
    return STATUS_LABELS[patrolStatus];
  }
  return patrolStatus ? String(patrolStatus) : "Police Visibility";
}
