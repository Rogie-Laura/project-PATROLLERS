/** Stable key for one patrol unit (token-backed mobile or legacy user row). */
export function locationUnitKey(row) {
  return row?.access_token_id || row?.user_id || null;
}

/** Drop one unit from the in-memory monitor list. */
export function removeLocationByKey(locations, key) {
  if (!key) return locations;
  return locations.filter((loc) => locationUnitKey(loc) !== key);
}

/** Merge one location row into a latest-per-unit array (max one row per access_token_id). */
export function upsertLatestLocationRow(locations, row) {
  if (!row) return locations;

  const key = locationUnitKey(row);
  if (!key) return locations;

  const map = new Map();
  for (const loc of locations) {
    const k = locationUnitKey(loc);
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

/** Apply one Realtime INSERT from location_updates (stop beacons remove the pin). */
export function applyLocationInsertRow(locations, row) {
  if (!row) return locations;

  const key = locationUnitKey(row);
  if (!key) return locations;

  if (row.tracking_active === false) {
    return removeLocationByKey(locations, key);
  }

  return upsertLatestLocationRow(locations, row);
}

/** Units that should appear on the live monitor map. */
export function isActivePatrolLocation(loc) {
  if (!loc) return false;
  if (loc.tracking_active === false) return false;
  if (loc.live_tracking_active === false) return false;
  return true;
}

export function filterActivePatrolLocations(locations) {
  return locations.filter(isActivePatrolLocation);
}
