import L from "leaflet";

/** Southwest and northeast corners — map pan/zoom stays within the Philippines. */
export const PHILIPPINES_BOUNDS = [
  [4.2, 115.8],
  [21.8, 127.8],
];

export const CALABARZON_CENTER = [14.2, 121.1];
export const CALABARZON_ZOOM = 9;

export const CALABARZON_BOUNDS = L.latLngBounds(
  [13.62, 120.7],
  [15.08, 122.4]
);

/** Prevents zooming out past the country; pair with maxBounds. */
export const MAP_MIN_ZOOM = 6;
export const MAP_MAX_ZOOM = 19;
export const MAX_BOUNDS_VISCOSITY = 1;
