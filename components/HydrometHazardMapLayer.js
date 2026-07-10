"use client";

import { useEffect, useRef, useState } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import { STORM_SURGE_OVERLAY, STORM_SURGE_STYLES } from "@/lib/mapHydrometOverlay";

export default function HydrometHazardMapLayer({ showStormSurge = false }) {
  const map = useMap();
  const layerGroupRef = useRef(null);
  const loadedRef = useRef(false);
  const [geojson, setGeojson] = useState(null);

  useEffect(() => {
    let cancelled = false;

    if (!showStormSurge || loadedRef.current) {
      return undefined;
    }

    loadedRef.current = true;

    fetch(STORM_SURGE_OVERLAY.geojsonPath)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (!cancelled) setGeojson(data);
      })
      .catch(() => {
        loadedRef.current = false;
      });

    return () => {
      cancelled = true;
    };
  }, [showStormSurge]);

  useEffect(() => {
    if (layerGroupRef.current) {
      map.removeLayer(layerGroupRef.current);
      layerGroupRef.current = null;
    }

    if (!showStormSurge || !geojson) {
      return undefined;
    }

    const group = L.geoJSON(geojson, {
      style(feature) {
        const ssa = Number(feature.properties?.ssa);
        const style = STORM_SURGE_STYLES[ssa] ?? STORM_SURGE_STYLES[1];
        return {
          color: style.color,
          weight: 1.25,
          opacity: 0.85,
          fillColor: style.color,
          fillOpacity: style.fillOpacity,
        };
      },
      onEachFeature(feature, layer) {
        const props = feature.properties ?? {};
        layer.bindTooltip(
          `<strong>Storm Surge — ${props.label ?? "Hazard"}</strong><br/>${props.province ?? ""}`,
          { sticky: true, opacity: 0.95 },
        );
      },
    });

    group.addTo(map);
    layerGroupRef.current = group;

    return () => {
      if (layerGroupRef.current) {
        map.removeLayer(layerGroupRef.current);
        layerGroupRef.current = null;
      }
    };
  }, [map, showStormSurge, geojson]);

  return null;
}
