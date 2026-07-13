import L from "leaflet";
import { getSmartLocatorCategoryColor } from "@/lib/smartLocator/categories";
import { getSmartLocatorPlotIcon } from "@/lib/smartLocator/icons";
import { SMART_LOCATOR_MARKER_REFERENCE_SIZE_PX } from "@/lib/smartLocator/markerSize";

export function createSmartLocatorIcon(
  categoryKey,
  subcategoryKey,
  markerSizePx = SMART_LOCATOR_MARKER_REFERENCE_SIZE_PX
) {
  const size =
    Number.isFinite(markerSizePx) && markerSizePx > 0
      ? Math.round(markerSizePx)
      : SMART_LOCATOR_MARKER_REFERENCE_SIZE_PX;
  const iconUrl = getSmartLocatorPlotIcon(categoryKey, subcategoryKey);

  if (iconUrl) {
    return L.icon({
      iconUrl,
      iconSize: [size, size],
      iconAnchor: [size / 2, size],
      popupAnchor: [0, -size + 2],
      className: "smart-locator-plot-icon",
    });
  }

  const color = getSmartLocatorCategoryColor(categoryKey);

  return L.divIcon({
    className: "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
    html: `<div style="
      width:${size}px;height:${size}px;border-radius:9999px;
      background:${color};border:2px solid #fff;
      box-shadow:0 2px 8px rgba(0,0,0,.35);
    "></div>`,
  });
}
