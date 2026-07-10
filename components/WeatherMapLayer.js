"use client";

import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import {
  MAP_WEATHER_OVERLAY_CLOUDS,
  MAP_WEATHER_OVERLAY_NONE,
  MAP_WEATHER_OVERLAY_PRECIPITATION,
  MAP_WEATHER_OVERLAY_RAIN_RADAR,
  MAP_WEATHER_OVERLAY_SATELLITE_IR,
  MAP_WEATHER_OVERLAY_TYPHOON_TRACK,
  MAP_WEATHER_OVERLAY_WEATHER_MAP,
} from "@/lib/mapWeatherOverlay";

const OWM_LAYER_BY_OVERLAY = {
  [MAP_WEATHER_OVERLAY_CLOUDS]: "clouds_new",
  [MAP_WEATHER_OVERLAY_PRECIPITATION]: "precipitation_new",
};

const RADAR_TILE_OPTS = {
  opacity: 0.78,
  maxNativeZoom: 7,
  maxZoom: 19,
  tileSize: 512,
  zoomOffset: -1,
  attribution: "RainViewer",
};

const SATELLITE_TILE_OPTS = {
  opacity: 0.58,
  maxNativeZoom: 7,
  maxZoom: 19,
  tileSize: 512,
  zoomOffset: -1,
  attribution: "RainViewer",
};

const CLOUD_FALLBACK_OPTS = {
  opacity: 0.45,
  maxZoom: 19,
  attribution: "© OpenWeatherMap",
};

function clearLayers(map, layerRefs) {
  for (const ref of layerRefs) {
    if (ref.current) {
      map.removeLayer(ref.current);
      ref.current = null;
    }
  }
}

export default function WeatherMapLayer({ overlayId = MAP_WEATHER_OVERLAY_NONE }) {
  const map = useMap();
  const radarLayerRef = useRef(null);
  const underlayLayerRef = useRef(null);
  const refreshTimerRef = useRef(null);

  useEffect(() => {
    clearLayers(map, [radarLayerRef, underlayLayerRef]);
    if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }

    if (!overlayId || overlayId === MAP_WEATHER_OVERLAY_NONE) {
      return undefined;
    }

    let cancelled = false;

    function addUnderlay(urlTemplate, options) {
      if (!urlTemplate) return;
      const layer = L.tileLayer(urlTemplate, options);
      layer.addTo(map);
      underlayLayerRef.current = layer;
    }

    function addRadar(urlTemplate) {
      if (!urlTemplate) return;
      const layer = L.tileLayer(urlTemplate, RADAR_TILE_OPTS);
      layer.addTo(map);
      radarLayerRef.current = layer;
    }

    async function mountRainViewerLayers({
      radar = false,
      satellite = false,
      cloudFallback = false,
    }) {
      const [radarRes, statusRes] = await Promise.all([
        fetch("/api/weather/radar"),
        cloudFallback ? fetch("/api/weather/status") : Promise.resolve(null),
      ]);
      const data = await radarRes.json();
      if (cancelled || !radarRes.ok) return;

      const status = statusRes ? await statusRes.json().catch(() => null) : null;
      const hasSatellite = Boolean(data?.satelliteTileUrlTemplate);
      const hasOwm = Boolean(status?.openWeatherMap);

      if (satellite && hasSatellite) {
        addUnderlay(data.satelliteTileUrlTemplate, SATELLITE_TILE_OPTS);
      } else if (cloudFallback && hasOwm) {
        addUnderlay(
          `/api/weather/tile?layer=clouds_new&z={z}&x={x}&y={y}`,
          CLOUD_FALLBACK_OPTS,
        );
      }

      if (radar) {
        addRadar(data.tileUrlTemplate);
      } else if (satellite && !hasSatellite && hasOwm) {
        // Satellite IR alone unavailable — show OWM clouds instead.
        addUnderlay(
          `/api/weather/tile?layer=clouds_new&z={z}&x={x}&y={y}`,
          CLOUD_FALLBACK_OPTS,
        );
      }

      refreshTimerRef.current = setInterval(async () => {
        try {
          const refresh = await fetch("/api/weather/radar");
          const meta = await refresh.json();
          if (!refresh.ok || cancelled) return;

          if (satellite && meta?.satelliteTileUrlTemplate) {
            if (underlayLayerRef.current) {
              map.removeLayer(underlayLayerRef.current);
            }
            addUnderlay(meta.satelliteTileUrlTemplate, SATELLITE_TILE_OPTS);
          }

          if (radar && meta?.tileUrlTemplate) {
            if (radarLayerRef.current) {
              map.removeLayer(radarLayerRef.current);
            }
            addRadar(meta.tileUrlTemplate);
          }
        } catch {
          /* keep current frames */
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
        },
      );

      layer.addTo(map);
      radarLayerRef.current = layer;
    }

    if (overlayId === MAP_WEATHER_OVERLAY_WEATHER_MAP) {
      mountRainViewerLayers({
        radar: true,
        satellite: true,
        cloudFallback: true,
      }).catch(() => {});
    } else if (overlayId === MAP_WEATHER_OVERLAY_RAIN_RADAR) {
      mountRainViewerLayers({ radar: true }).catch(() => {});
    } else if (overlayId === MAP_WEATHER_OVERLAY_SATELLITE_IR) {
      mountRainViewerLayers({ satellite: true, cloudFallback: true }).catch(
        () => {},
      );
    } else if (
      overlayId !== MAP_WEATHER_OVERLAY_TYPHOON_TRACK &&
      OWM_LAYER_BY_OVERLAY[overlayId]
    ) {
      mountOpenWeatherLayer();
    }

    return () => {
      cancelled = true;
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
      clearLayers(map, [radarLayerRef, underlayLayerRef]);
    };
  }, [map, overlayId]);

  return null;
}
