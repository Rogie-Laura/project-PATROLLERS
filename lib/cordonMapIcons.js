import L from "leaflet";

const PRIORITY_COLORS = {
  high: "#f97316",
  medium: "#eab308",
  low: "#94a3b8",
};

export function createCheckpointIcon(priority = "medium", isHighlighted = false) {
  const color = PRIORITY_COLORS[priority] || PRIORITY_COLORS.medium;
  const size = isHighlighted ? 16 : 12;
  const border = isHighlighted ? 3 : 2;

  return L.divIcon({
    className: "cordon-checkpoint",
    html: `<div style="
      width: ${size}px;
      height: ${size}px;
      background: ${color};
      border: ${border}px solid #fff;
      border-radius: 2px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.45);
      transform: rotate(45deg);
    "></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}
