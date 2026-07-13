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
  "iso:white_area": "/smart-locator/icons/white_area.png",
  "iso:red_area": "/smart-locator/icons/red_area.png",
  "iso:gidas": "/smart-locator/icons/GIDAS.png",
  "area_of_convergence:public_park": "/smart-locator/icons/public_park.png",
  "area_of_convergence:freedom_park": "/smart-locator/icons/freedom_park.png",
  "area_of_convergence:cemetery": "/smart-locator/icons/cemetery.png",
  "educational_institutions:daycares": "/smart-locator/icons/daycare.png",
  "educational_institutions:elementary_schools":
    "/smart-locator/icons/elementary.png",
  "educational_institutions:high_schools": "/smart-locator/icons/secondary.png",
  "educational_institutions:colleges": "/smart-locator/icons/college.png",
  "educational_institutions:universities":
    "/smart-locator/icons/universities.png",
};

export function getSmartLocatorPlotIcon(category, subcategory) {
  const key = `${String(category ?? "").trim()}:${String(subcategory ?? "").trim()}`;
  return SMART_LOCATOR_PLOT_ICONS[key] ?? null;
}
