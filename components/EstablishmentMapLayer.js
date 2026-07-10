"use client";

import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";

export default function EstablishmentMapLayer({
  establishments = [],
  enabled = false,
}) {
  const map = useMap();
  const layerRef = useRef(null);

  useEffect(() => {
    if (layerRef.current) {
      map.removeLayer(layerRef.current);
      layerRef.current = null;
    }

    if (!enabled || establishments.length === 0) {
      return undefined;
    }

    const features = establishments
      .filter(
        (item) =>
          Number.isFinite(item.latitude) &&
          Number.isFinite(item.longitude),
      )
      .map((item) => ({
        type: "Feature",
        properties: {
          name: item.name,
          type: item.establishmentType,
          ppo: item.ppo,
          station: item.station,
          location: item.location,
        },
        geometry: {
          type: "Point",
          coordinates: [item.longitude, item.latitude],
        },
      }));

    const layer = L.geoJSON(
      { type: "FeatureCollection", features },
      {
        pointToLayer(_feature, latlng) {
          return L.circleMarker(latlng, {
            radius: 4,
            color: "#b45309",
            fillColor: "#f59e0b",
            fillOpacity: 0.9,
            weight: 1,
          });
        },
        onEachFeature(feature, markerLayer) {
          const props = feature.properties ?? {};
          markerLayer.bindTooltip(
            `<strong>${props.name ?? "Establishment"}</strong><br/>${props.type ?? ""}<br/>${props.ppo ?? ""} · ${props.station ?? ""}`,
            { direction: "top", opacity: 0.95 },
          );
        },
      },
    );

    layer.addTo(map);
    layerRef.current = layer;

    return () => {
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }
    };
  }, [map, enabled, establishments]);

  return null;
}
