import L from "leaflet";
import { getSmartLocatorCategoryColor } from "@/lib/smartLocator/categories";
import { getSmartLocatorPlotIcon } from "@/lib/smartLocator/icons";

export function createSmartLocatorIcon(categoryKey, subcategoryKey) {
  const iconUrl = getSmartLocatorPlotIcon(categoryKey, subcategoryKey);

  if (iconUrl) {
    return L.icon({
      iconUrl,
      iconSize: [28, 28],
      iconAnchor: [14, 28],
      popupAnchor: [0, -26],
      className: "smart-locator-plot-icon",
    });
  }

  const color = getSmartLocatorCategoryColor(categoryKey);

  return L.divIcon({
    className: "",
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -12],
    html: `<div style="
      width:28px;height:28px;border-radius:9999px;
      background:${color};border:2px solid #fff;
      box-shadow:0 2px 8px rgba(0,0,0,.35);
    "></div>`,
  });
}
