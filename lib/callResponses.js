/** Map a call_responses DB row to the client / map shape. */
export function callResponseFromRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    label: row.label,
    status: row.status,
    office: row.office ?? null,
    unit: row.unit ?? null,
    createdAt: row.created_at,
    createdBy: row.created_by ?? null,
    closedAt: row.closed_at ?? null,
    closedBy: row.closed_by ?? null,
    closureOutcome: row.closure_outcome ?? null,
    closureRemarks: row.closure_remarks ?? null,
  };
}

export function callResponsesFromRows(rows) {
  return (rows ?? []).map(callResponseFromRow).filter(Boolean);
}
