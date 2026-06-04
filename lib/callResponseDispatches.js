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
  };
}

export function dispatchesFromRows(rows) {
  if (!Array.isArray(rows)) return [];
  return rows.map(dispatchFromRow).filter(Boolean);
}
