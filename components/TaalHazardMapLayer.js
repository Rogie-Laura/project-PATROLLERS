"use client";

import { useEffect, useRef, useState } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import { getTaalHazardLayerOption } from "@/lib/mapTaalHazardOverlay";

export default function TaalHazardMapLayer({ layerIds = [] }) {
  const map = useMap();
  const layerGroupRef = useRef(null);
  const loadedRef = useRef(new Set());
  const [cache, setCache] = useState({});

  useEffect(() => {
    let cancelled = false;

    for (const id of layerIds) {
      if (id === "none" || loadedRef.current.has(id)) continue;

      const option = getTaalHazardLayerOption(id);
      if (!option?.geojsonPath) continue;

      loadedRef.current.add(id);

      fetch(option.geojsonPath)
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        })
        .then((geojson) => {
          if (!cancelled) {
            setCache((prev) => ({ ...prev, [id]: geojson }));
          }
        })
        .catch(() => {
          loadedRef.current.delete(id);
        });
    }

    return () => {
      cancelled = true;
    };
  }, [layerIds]);

  useEffect(() => {
    if (layerGroupRef.current) {
      map.removeLayer(layerGroupRef.current);
      layerGroupRef.current = null;
    }

    const activeIds = layerIds.filter((id) => id !== "none");
    if (activeIds.length === 0) {
      return undefined;
    }

    const group = L.layerGroup();

    for (const id of activeIds) {
      const option = getTaalHazardLayerOption(id);
      const geojson = cache[id];
      if (!option || !geojson) continue;

      const layer = L.geoJSON(geojson, {
        style: {
          color: option.color,
          weight: 1.5,
          fillColor: option.color,
          fillOpacity: 0.22,
          opacity: 0.85,
        },
        onEachFeature(feature, featureLayer) {
          const name =
            feature.properties?.name ??
            feature.properties?.Name ??
            feature.properties?.description ??
            option.label;
          featureLayer.bindTooltip(`<strong>${option.label}</strong><br/>${name ?? ""}`, {
            sticky: true,
            opacity: 0.95,
          });
        },
      });
      layer.addTo(group);
    }

    if (group.getLayers().length > 0) {
      group.addTo(map);
      layerGroupRef.current = group;
    }

    return () => {
      if (layerGroupRef.current) {
        map.removeLayer(layerGroupRef.current);
        layerGroupRef.current = null;
      }
    };
  }, [map, layerIds, cache]);

  return null;
}
