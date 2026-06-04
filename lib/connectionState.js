export const CONNECTION_STATE = {
  strong: "strong",
  weak: "weak",
  stale: "stale",
};

// Border colors per connection/signal state (fill stays patrol-status color).
export const CONNECTION_BORDER_COLOR = {
  strong: "#3b82f6", // blue — active, strong signal
  weak: "#f59e0b", // orange — active, weak signal
  stale: "#9ca3af", // gray — disconnected / no fresh update
};

export const CONNECTION_LABEL = {
  strong: "Strong signal",
  weak: "Weak signal",
  stale: "Disconnected",
};

/**
 * Stale threshold scales with the configured reporting interval so a unit that
 * reports every 30 min is not flagged stale after a few seconds.
 */
export function staleThresholdMs(intervalSeconds) {
  const seconds = Number(intervalSeconds);
  const base = Number.isFinite(seconds) && seconds > 0 ? seconds : 180;
  return base * 2.5 * 1000 + 45000;
}

/**
 * Derive the live connection state for a unit's latest location row.
 * - No fresh update within the threshold -> "stale" (gray)
 * - Weak signal level reported -> "weak" (orange)
 * - Otherwise -> "strong" (blue)
 */
export function getConnectionState(location, nowMs, thresholdMs) {
  const recordedAt = location?.created_at
    ? new Date(location.created_at).getTime()
    : null;

  if (recordedAt == null || Number.isNaN(recordedAt)) {
    return CONNECTION_STATE.stale;
  }

  if (nowMs - recordedAt > thresholdMs) {
    return CONNECTION_STATE.stale;
  }

  const level = String(location?.signal_level ?? "").toLowerCase();
  if (level === "none") return CONNECTION_STATE.stale;
  if (level === "weak") return CONNECTION_STATE.weak;

  return CONNECTION_STATE.strong;
}
