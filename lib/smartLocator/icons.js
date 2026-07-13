/** Plot icons under /public/smart-locator/icons/ — keys are category:subcategory */
export const SMART_LOCATOR_PLOT_ICONS = {
  "pnp_establishments:police_station": "/smart-locator/icons/police_station.png",
  "pnp_establishments:sub_station_pcp": "/smart-locator/icons/sub-station.png",
  "pnp_establishments:pac": "/smart-locator/icons/PAC.png",
  "pnp_establishments:sscp": "/smart-locator/icons/SSCP.png",
  "pnp_establishments:bcp": "/smart-locator/icons/BCP.png",
  "friendly_units:phil_army": "/smart-locator/icons/army.png",
  "friendly_units:phil_navy": "/smart-locator/icons/navy.png",
  "friendly_units:phil_airforce": "/smart-locator/icons/airforce.png",
  "friendly_units:phil_marines": "/smart-locator/icons/marines.png",
  "friendly_units:pcg": "/smart-locator/icons/pcg.png",
  "friendly_units:bfp": "/smart-locator/icons/bfp.png",
  "friendly_units:bjmp": "/smart-locator/icons/bjmp.png",
};

export function getSmartLocatorPlotIcon(category, subcategory) {
  const key = `${String(category ?? "").trim()}:${String(subcategory ?? "").trim()}`;
  return SMART_LOCATOR_PLOT_ICONS[key] ?? null;
}
