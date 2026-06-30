"use client";

import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import {
  MAP_WEATHER_OVERLAY_CLOUDS,
  MAP_WEATHER_OVERLAY_NONE,
  MAP_WEATHER_OVERLAY_PRECIPITATION,
  MAP_WEATHER_OVERLAY_RAIN_RADAR,
} from "@/lib/mapWeatherOverlay";

const OWM_LAYER_BY_OVERLAY = {
  [MAP_WEATHER_OVERLAY_CLOUDS]: "clouds_new",
  [MAP_WEATHER_OVERLAY_PRECIPITATION]: "precipitation_new",
};

function removeLayer(map, layerRef) {
  if (layerRef.current) {
    map.removeLayer(layerRef.current);
    layerRef.current = null;
  }
}

export default function WeatherMapLayer({ overlayId = MAP_WEATHER_OVERLAY_NONE }) {
  const map = useMap();
  const layerRef = useRef(null);
  const refreshTimerRef = useRef(null);

  useEffect(() => {
    removeLayer(map, layerRef);
    if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }

    if (!overlayId || overlayId === MAP_WEATHER_OVERLAY_NONE) {
      return undefined;
    }

    let cancelled = false;

    async function mountRainRadar() {
      const res = await fetch("/api/weather/radar");
      const data = await res.json();
      if (cancelled || !res.ok || !data?.tileUrlTemplate) return;

      const layer = L.tileLayer(data.tileUrlTemplate, {
        opacity: 0.55,
        maxNativeZoom: 7,
        maxZoom: 19,
        attribution: "RainViewer",
      });

      layer.addTo(map);
      layerRef.current = layer;

      refreshTimerRef.current = setInterval(async () => {
        try {
          const refresh = await fetch("/api/weather/radar");
          const meta = await refresh.json();
          if (!refresh.ok || !meta?.tileUrlTemplate || cancelled) return;
          if (layerRef.current) {
            map.removeLayer(layerRef.current);
          }
          const nextLayer = L.tileLayer(meta.tileUrlTemplate, {
            opacity: 0.55,
            maxNativeZoom: 7,
            maxZoom: 19,
            attribution: "RainViewer",
          });
          nextLayer.addTo(map);
          layerRef.current = nextLayer;
        } catch {
          /* keep current radar frame */
        }
      }, 5 * 60 * 1000);
    }

    function mountOpenWeatherLayer() {
      const owmLayer = OWM_LAYER_BY_OVERLAY[overlayId];
      if (!owmLayer) return;

      const layer = L.tileLayer(
        `/api/weather/tile?layer=${owmLayer}&z={z}&x={x}&y={y}`,
        {
          opacity: 0.55,
          maxZoom: 19,
          attribution: "© OpenWeatherMap",
        }
      );

      layer.addTo(map);
      layerRef.current = layer;
    }

    if (overlayId === MAP_WEATHER_OVERLAY_RAIN_RADAR) {
      mountRainRadar().catch(() => {});
    } else {
      mountOpenWeatherLayer();
    }

    return () => {
      cancelled = true;
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
      removeLayer(map, layerRef);
    };
  }, [map, overlayId]);

  return null;
}
