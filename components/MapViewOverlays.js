"use client";

import MapLegendOverlay from "@/components/MapLegendOverlay";
import MapStatisticsOverlay from "@/components/MapStatisticsOverlay";
import MapViewLayerPlaceholder from "@/components/MapViewLayerPlaceholder";

export default function MapViewOverlays({
  layers,
  locations = [],
  nowMs = Date.now(),
  intervalSeconds = 180,
  mapAreaSize = null,
}) {
  const hasRightStack =
    layers.pnpStations ||
    layers.friendlyUnit ||
    layers.crimeEnvironment ||
    layers.signalStats;

  return (
    <>
      {layers.legend && (
        <MapLegendOverlay locations={locations} bounds={mapAreaSize} />
      )}

      {hasRightStack && (
        <div className="pointer-events-none absolute right-0 top-0 z-[500] flex flex-col items-end gap-2">
          {layers.pnpStations && (
            <MapViewLayerPlaceholder title="PNP Stations" />
          )}
          {layers.friendlyUnit && (
            <MapViewLayerPlaceholder title="Friendly Unit" />
          )}
          {layers.crimeEnvironment && (
            <MapViewLayerPlaceholder title="Crime Environment" />
          )}
          {layers.signalStats && (
            <MapStatisticsOverlay
              locations={locations}
              nowMs={nowMs}
              intervalSeconds={intervalSeconds}
            />
          )}
        </div>
      )}
    </>
  );
}
