export const DISPATCH_ROLE = {
  primary: "primary",
  cordon: "cordon",
};

export const DISPATCH_STATUS = {
  pending: "pending",
  accepted: "accepted",
  arrived: "arrived",
  declined: "declined",
  cancelled: "cancelled",
};

export const DISPATCH_RESULTS = [
  {
    value: "vehicular_accident_turnover",
    label: "Vehicular Accident — Turn-over to Local Station",
  },
  {
    value: "turn_over_brgy",
    label: "Turn-over at Barangay",
  },
  {
    value: "suspect_arrested",
    label: "Suspect was Arrested",
  },
  {
    value: "prank_call",
    label: "Prank Call",
  },
  {
    value: "other",
    label: "Others — please specify",
  },
];

export function getDispatchResultLabel(value, note) {
  if (!value) return null;
  const match = DISPATCH_RESULTS.find((item) => item.value === value);
  const base = match?.label ?? value;
  if (value === "other" && note) return `${base}: ${note}`;
  return note ? `${base} — ${note}` : base;
}

export const DISPATCH_COPY = {
  primary: {
    title: "Respond to incident",
    message:
      "One incident reported in your area. Proceed to the location immediately and coordinate with RCC.",
  },
  cordon: {
    title: "Conduct dragnet",
    message:
      "Conduct dragnet operation. Support responding units and secure the perimeter near the incident area.",
  },
};

export function dispatchFromRow(row) {
  if (!row) return null;

  return {
    id: row.id,
    callResponseId: row.call_response_id,
    accessTokenId: row.access_token_id,
    role: row.role,
    title: row.title,
    message: row.message,
    distanceMeters: row.distance_meters ?? null,
    status: row.status,
    createdAt: row.created_at,
    respondedAt: row.responded_at ?? null,
    acknowledgedAt: row.acknowledged_at ?? null,
    arrivedAt: row.arrived_at ?? null,
    result: row.result ?? null,
    resultNote: row.result_note ?? null,
    closedAt: row.closed_at ?? null,
  };
}

export function dispatchesFromRows(rows) {
  if (!Array.isArray(rows)) return [];
  return rows.map(dispatchFromRow).filter(Boolean);
}
