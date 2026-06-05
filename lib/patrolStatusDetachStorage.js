const POSITION_KEY = "patrollers.patrolStatus.detach.position";
const LOCKED_KEY = "patrollers.patrolStatus.detach.locked";

const DEFAULT_POSITION = { x: null, y: 80 };

export function readDetachLocked() {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(LOCKED_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeDetachLocked(locked) {
  try {
    sessionStorage.setItem(LOCKED_KEY, locked ? "1" : "0");
  } catch {
    /* ignore */
  }
}

export function readDetachPosition() {
  if (typeof window === "undefined") return DEFAULT_POSITION;
  try {
    const raw = sessionStorage.getItem(POSITION_KEY);
    if (!raw) return DEFAULT_POSITION;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.x === "number" && typeof parsed?.y === "number") {
      return { x: parsed.x, y: parsed.y };
    }
  } catch {
    /* ignore */
  }
  return DEFAULT_POSITION;
}

export function writeDetachPosition(position) {
  try {
    sessionStorage.setItem(POSITION_KEY, JSON.stringify(position));
  } catch {
    /* ignore */
  }
}

export function defaultDetachPosition(panelWidth = 340) {
  if (typeof window === "undefined") return { x: 16, y: 80 };
  return {
    x: Math.max(8, window.innerWidth - panelWidth - 16),
    y: 80,
  };
}
