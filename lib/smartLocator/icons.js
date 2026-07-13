/** Plot icons under /public/smart-locator/icons/ — keys are category:subcategory */
export const SMART_LOCATOR_PLOT_ICONS = {
  "pnp_establishments:police_station": "/smart-locator/icons/police_station.png",
  "pnp_establishments:sub_station_pcp": "/smart-locator/icons/sub-station.png",
  "pnp_establishments:pac": "/smart-locator/icons/PAC.png",
  "pnp_establishments:sscp": "/smart-locator/icons/SSCP.png",
  "pnp_establishments:bcp": "/smart-locator/icons/BCP.png",
};

export function getSmartLocatorPlotIcon(category, subcategory) {
  const key = `${String(category ?? "").trim()}:${String(subcategory ?? "").trim()}`;
  return SMART_LOCATOR_PLOT_ICONS[key] ?? null;
}
