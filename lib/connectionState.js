export const CONNECTION_STATE = {
  strong: "strong",
  weak: "weak",
  delayed: "delayed",
  stale: "stale",
};

// Border colors per connection/signal state (fill stays patrol-status color).
export const CONNECTION_BORDER_COLOR = {
  strong: "#3b82f6", // blue — recent update, good signal
  weak: "#f59e0b", // orange — recent update, weak/offline signal at send
  delayed: "#eab308", // yellow — overdue for next GPS ping, still on map
  stale: "#9ca3af", // gray — no update for a long time
};

/** Marker border / patrol list dot tooltip. */
export const CONNECTION_LABEL = {
  strong: "Online",
  weak: "Online · weak signal",
  delayed: "Update delayed",
  stale: "No recent update",
};

/** Unit detail panel — ops-friendly wording. */
export const LIVE_STATUS_LABEL = {
  strong: "Online",
  weak: "Online · weak signal",
  delayed: "Update delayed",
  stale: "No recent update",
};

export function formatSignalStrength(location) {
  const level = String(location?.signal_level ?? "").toLowerCase();
  if (level === "strong") return "Strong";
  if (level === "weak") return "Weak";
  if (level === "none") return location?.signal_label || "Offline";
  return location?.signal_label || "—";
}

function intervalBaseMs(intervalSeconds) {
  const seconds = Number(intervalSeconds);
  const base = Number.isFinite(seconds) && seconds > 0 ? seconds : 180;
  return base * 1000;
}

/** After this age the next GPS ping was expected (1.5× interval). */
export function delayedAfterMs(intervalSeconds) {
  return intervalBaseMs(intervalSeconds) * 1.5;
}

/** Allow ~3 missed GPS reports before marking gray (3 min interval → ~13 min). */
export function staleAfterMs(intervalSeconds) {
  return intervalBaseMs(intervalSeconds) * 4 + 60000;
}

/** @deprecated Use staleAfterMs — kept for callers passing ms thresholds. */
export function staleThresholdMs(intervalSeconds) {
  return staleAfterMs(intervalSeconds);
}

export function formatLastUpdateAge(location, nowMs = Date.now()) {
  const recordedAt = location?.created_at
    ? new Date(location.created_at).getTime()
    : null;

  if (recordedAt == null || Number.isNaN(recordedAt)) return "Unknown";

  const sec = Math.max(0, Math.floor((nowMs - recordedAt) / 1000));
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  const rem = min % 60;
  return rem > 0 ? `${hr}h ${rem}m ago` : `${hr}h ago`;
}

/**
 * Derive connection state from the latest location row age + signal at last send.
 * intervalSeconds should match System Settings (default 3 min).
 */
export function getConnectionState(location, nowMs, intervalSeconds) {
  const recordedAt = location?.created_at
    ? new Date(location.created_at).getTime()
    : null;

  if (recordedAt == null || Number.isNaN(recordedAt)) {
    return CONNECTION_STATE.stale;
  }

  const ageMs = nowMs - recordedAt;
  const staleMs = staleAfterMs(intervalSeconds);
  const delayedMs = delayedAfterMs(intervalSeconds);

  if (ageMs > staleMs) {
    return CONNECTION_STATE.stale;
  }

  if (ageMs > delayedMs) {
    return CONNECTION_STATE.delayed;
  }

  const level = String(location?.signal_level ?? "").toLowerCase();
  if (level === "none" || level === "weak") {
    return CONNECTION_STATE.weak;
  }

  return CONNECTION_STATE.strong;
}

/** Hover text for map markers and list tooltips. */
export function formatMonitorLinkSummary(location, nowMs, intervalSeconds) {
  const state = getConnectionState(location, nowMs, intervalSeconds);
  const label = LIVE_STATUS_LABEL[state] || LIVE_STATUS_LABEL.strong;
  return `${label} · ${formatLastUpdateAge(location, nowMs)}`;
}
