/** CALABARZON defaults — keep free of Leaflet so SSR can import this module. */
const DEFAULT_LAT = 14.2;
const DEFAULT_LON = 121.1;
const DEFAULT_ZOOM = 9;

export const MAP_WEATHER_OVERLAY_WINDY = "windy";

export const WINDY_OVERLAY_OPTIONS = [
  { id: "wind", label: "Wind" },
  { id: "rain", label: "Rain" },
  { id: "thunder", label: "Thunderstorms" },
  { id: "temp", label: "Temperature" },
  { id: "clouds", label: "Clouds" },
  { id: "pressure", label: "Pressure" },
  { id: "radar", label: "Radar" },
  { id: "satellite", label: "Satellite" },
  { id: "waves", label: "Waves" },
  { id: "currents", label: "Currents" },
];

export function clampWindyZoom(zoom) {
  const n = Number(zoom);
  if (!Number.isFinite(n)) return DEFAULT_ZOOM;
  return Math.min(11, Math.max(4, Math.round(n)));
}

export function buildWindyEmbedUrl({
  lat = DEFAULT_LAT,
  lon = DEFAULT_LON,
  zoom = DEFAULT_ZOOM,
  overlay = "wind",
} = {}) {
  const safeLat = Number.isFinite(Number(lat)) ? Number(lat) : DEFAULT_LAT;
  const safeLon = Number.isFinite(Number(lon)) ? Number(lon) : DEFAULT_LON;
  const safeZoom = clampWindyZoom(zoom);
  const overlayId = WINDY_OVERLAY_OPTIONS.some((option) => option.id === overlay)
    ? overlay
    : "wind";

  const params = new URLSearchParams({
    lat: String(safeLat),
    lon: String(safeLon),
    detailLat: String(safeLat),
    detailLon: String(safeLon),
    zoom: String(safeZoom),
    level: "surface",
    overlay: overlayId,
    product: "ecmwf",
    menu: "",
    message: "true",
    marker: "",
    calendar: "now",
    pressure: "",
    type: "map",
    location: "coordinates",
    detail: "",
    metricWind: "default",
    metricTemp: "default",
    radarRange: "-1",
  });

  return `https://embed.windy.com/embed2.html?${params.toString()}`;
}

export function buildWindySiteUrl({
  lat = DEFAULT_LAT,
  lon = DEFAULT_LON,
  zoom = DEFAULT_ZOOM,
  overlay = "wind",
} = {}) {
  const safeLat = Number.isFinite(Number(lat)) ? Number(lat) : DEFAULT_LAT;
  const safeLon = Number.isFinite(Number(lon)) ? Number(lon) : DEFAULT_LON;
  const safeZoom = clampWindyZoom(zoom);
  const overlayId = WINDY_OVERLAY_OPTIONS.some((option) => option.id === overlay)
    ? overlay
    : "wind";
  return `https://www.windy.com/${safeLat.toFixed(3)}/${safeLon.toFixed(3)}?${overlayId},${safeZoom}`;
}
