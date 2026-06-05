"use client";

import MapViewStackPanel from "@/components/MapViewStackPanel";

export default function MapViewOverlays({
  layers,
  locations = [],
  nowMs = Date.now(),
  intervalSeconds = 180,
  mapAreaSize = null,
}) {
  return (
    <MapViewStackPanel
      layers={layers}
      locations={locations}
      nowMs={nowMs}
      intervalSeconds={intervalSeconds}
      bounds={mapAreaSize}
    />
  );
}
