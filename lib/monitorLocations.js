/** Merge one location row into a latest-per-unit array (max one row per access_token_id). */
export function upsertLatestLocationRow(locations, row) {
  if (!row) return locations;

  const key = row.access_token_id || row.user_id;
  if (!key) return locations;

  const map = new Map();
  for (const loc of locations) {
    const k = loc.access_token_id || loc.user_id;
    if (k) map.set(k, loc);
  }

  const existing = map.get(key);
  if (
    !existing ||
    new Date(row.created_at).getTime() >= new Date(existing.created_at).getTime()
  ) {
    const lastSeenAt = row.last_seen_at ?? existing?.last_seen_at ?? null;
    map.set(key, lastSeenAt ? { ...row, last_seen_at: lastSeenAt } : row);
  }

  return Array.from(map.values());
}
