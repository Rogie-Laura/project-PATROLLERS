const POSITION_KEY = "patrollers.map.legend.position";

export const LEGEND_PANEL_WIDTH = 300;

export function defaultLegendPosition() {
  return { x: 0, y: 0 };
}

export function readLegendPosition() {
  if (typeof window === "undefined") return defaultLegendPosition();
  try {
    const raw = sessionStorage.getItem(POSITION_KEY);
    if (!raw) return defaultLegendPosition();
    const parsed = JSON.parse(raw);
    if (typeof parsed?.x === "number" && typeof parsed?.y === "number") {
      return { x: parsed.x, y: parsed.y };
    }
  } catch {
    /* ignore */
  }
  return defaultLegendPosition();
}

export function writeLegendPosition(position) {
  try {
    sessionStorage.setItem(POSITION_KEY, JSON.stringify(position));
  } catch {
    /* ignore */
  }
}

export function clampLegendPosition(x, y, bounds, panelHeight = 240) {
  const width = LEGEND_PANEL_WIDTH;
  const maxX = bounds?.width
    ? Math.max(0, bounds.width - width)
    : Number.POSITIVE_INFINITY;
  const maxY = bounds?.height
    ? Math.max(0, bounds.height - panelHeight)
    : Number.POSITIVE_INFINITY;

  return {
    x: Math.min(Math.max(0, x), maxX),
    y: Math.min(Math.max(0, y), maxY),
  };
}
