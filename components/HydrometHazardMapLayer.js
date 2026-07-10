"use client";

import { useEffect, useRef, useState } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import {
  FLOOD_LEVEL_STYLES,
  FLOOD_PRONE_OVERLAY,
  STORM_SURGE_OVERLAY,
  STORM_SURGE_STYLES,
} from "@/lib/mapHydrometOverlay";

function styleForFeature(feature, overlayKind) {
  if (overlayKind === "flood") {
    const level = Number(feature.properties?.level);
    return FLOOD_LEVEL_STYLES[level] ?? FLOOD_LEVEL_STYLES[2];
  }
  const ssa = Number(feature.properties?.ssa);
  return STORM_SURGE_STYLES[ssa] ?? STORM_SURGE_STYLES[1];
}

export default function HydrometHazardMapLayer({
  showFloodProne = false,
  showStormSurge = false,
}) {
  const map = useMap();
  const layerGroupRef = useRef(null);
  const loadedRef = useRef({ flood: false, stormSurge: false });
  const [cache, setCache] = useState({ flood: null, stormSurge: null });

  useEffect(() => {
    let cancelled = false;

    if (showFloodProne && !loadedRef.current.flood) {
      loadedRef.current.flood = true;
      Promise.all(
        FLOOD_PRONE_OVERLAY.provincePaths.map((url) =>
          fetch(url).then((res) => {
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return res.json();
          }),
        ),
      )
        .then((collections) => {
          if (cancelled) return;
          const features = collections.flatMap((collection) => collection.features ?? []);
          setCache((prev) => ({ ...prev, flood: { type: "FeatureCollection", features } }));
        })
        .catch(() => {
          loadedRef.current.flood = false;
        });
    }

    if (showStormSurge && !loadedRef.current.stormSurge) {
      loadedRef.current.stormSurge = true;
      fetch(STORM_SURGE_OVERLAY.geojsonPath)
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        })
        .then((geojson) => {
          if (!cancelled) {
            setCache((prev) => ({ ...prev, stormSurge: geojson }));
          }
        })
        .catch(() => {
          loadedRef.current.stormSurge = false;
        });
    }

    return () => {
      cancelled = true;
    };
  }, [showFloodProne, showStormSurge]);

  useEffect(() => {
    if (layerGroupRef.current) {
      map.removeLayer(layerGroupRef.current);
      layerGroupRef.current = null;
    }

    if (!showFloodProne && !showStormSurge) {
      return undefined;
    }

    const group = L.layerGroup();

    if (showFloodProne && cache.flood) {
      L.geoJSON(cache.flood, {
        style(feature) {
          const style = styleForFeature(feature, "flood");
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
            `<strong>Flood Prone — ${props.label ?? "Hazard"}</strong><br/>${props.province ?? ""}`,
            { sticky: true, opacity: 0.95 },
          );
        },
      }).addTo(group);
    }

    if (showStormSurge && cache.stormSurge) {
      L.geoJSON(cache.stormSurge, {
        style(feature) {
          const style = styleForFeature(feature, "stormSurge");
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
      }).addTo(group);
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
  }, [map, showFloodProne, showStormSurge, cache]);

  return null;
}
