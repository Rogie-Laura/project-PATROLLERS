/** Map Overlay — weather layer ids (web monitor map only). */

export const MAP_WEATHER_OVERLAY_NONE = "none";
export const MAP_WEATHER_OVERLAY_RAIN_RADAR = "rainRadar";
export const MAP_WEATHER_OVERLAY_CLOUDS = "clouds";
export const MAP_WEATHER_OVERLAY_PRECIPITATION = "precipitation";
export const MAP_WEATHER_OVERLAY_TYPHOON_TRACK = "typhoonTrack";

export const MAP_WEATHER_OVERLAY_OPTIONS = [
  {
    id: MAP_WEATHER_OVERLAY_NONE,
    label: "None",
    description: "No weather overlay on the map.",
    requiresOpenWeatherMap: false,
    free: true,
  },
  {
    id: MAP_WEATHER_OVERLAY_RAIN_RADAR,
    label: "Rain radar",
    description: "Live precipitation radar tiles (RainViewer).",
    requiresOpenWeatherMap: false,
    free: true,
  },
  {
    id: MAP_WEATHER_OVERLAY_CLOUDS,
    label: "Cloud cover",
    description: "Cloud layer from OpenWeatherMap.",
    requiresOpenWeatherMap: true,
    free: false,
  },
  {
    id: MAP_WEATHER_OVERLAY_PRECIPITATION,
    label: "Precipitation",
    description: "Rain intensity layer from OpenWeatherMap.",
    requiresOpenWeatherMap: true,
    free: false,
  },
  {
    id: MAP_WEATHER_OVERLAY_TYPHOON_TRACK,
    label: "Typhoon track",
    description:
      "Active cyclone path and forecast cone in the Western Pacific / PAR (GDACS/JTWC).",
    requiresOpenWeatherMap: false,
    free: true,
  },
];

export function getWeatherOverlayOption(id) {
  return MAP_WEATHER_OVERLAY_OPTIONS.find((option) => option.id === id) ?? null;
}

export function normalizeWeatherOverlayId(value) {
  const raw = String(value ?? "").trim();
  if (MAP_WEATHER_OVERLAY_OPTIONS.some((option) => option.id === raw)) return raw;
  return MAP_WEATHER_OVERLAY_NONE;
}
