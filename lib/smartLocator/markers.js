import L from "leaflet";
import { SMART_LOCATOR_CATEGORIES } from "@/lib/smartLocator/categories";

export function createSmartLocatorIcon(categoryKey) {
  const category = SMART_LOCATOR_CATEGORIES[categoryKey] ?? SMART_LOCATOR_CATEGORIES.other;
  const color = category.color;

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
