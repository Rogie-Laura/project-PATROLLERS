/** Plot icons under /public/smart-locator/icons/ — keys are category:subcategory */
export const SMART_LOCATOR_PLOT_ICONS = {
  "pnp_establishments:stations": "/smart-locator/icons/Stations.png",
};

export function getSmartLocatorPlotIcon(category, subcategory) {
  const key = `${String(category ?? "").trim()}:${String(subcategory ?? "").trim()}`;
  return SMART_LOCATOR_PLOT_ICONS[key] ?? null;
}
