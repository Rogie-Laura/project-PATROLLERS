"use client";

import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import { MAP_WEATHER_OVERLAY_TYPHOON_TRACK } from "@/lib/mapWeatherOverlay";

function cycloneStyle(feature) {
  const cls = String(feature?.properties?.Class ?? "");

  if (cls.startsWith("Line_Line")) {
    return {
      color: "#2563eb",
      weight: 3,
      opacity: 0.9,
    };
  }

  if (cls === "Poly_Cones") {
    return {
      color: "#f59e0b",
      weight: 2,
      dashArray: "6 4",
      fillColor: "#f59e0b",
      fillOpacity: 0.08,
    };
  }

  if (cls === "Poly_Red") {
    return {
      color: "#ef4444",
      weight: 1.5,
      fillColor: "#ef4444",
      fillOpacity: 0.12,
    };
  }

  if (cls === "Poly_Orange") {
    return {
      color: "#f97316",
      weight: 1.5,
      fillColor: "#f97316",
      fillOpacity: 0.1,
    };
  }

  if (cls === "Poly_Green") {
    return {
      color: "#22c55e",
      weight: 1.5,
      fillColor: "#22c55e",
      fillOpacity: 0.08,
    };
  }

  if (cls.startsWith("Point_Polygon_Point")) {
    return {
      color: "#1d4ed8",
      weight: 2,
      fillColor: "#3b82f6",
      fillOpacity: 0.85,
      radius: 4,
    };
  }

  if (cls === "Point_Centroid") {
    return {
      color: "#dc2626",
      weight: 2,
      fillColor: "#ef4444",
      fillOpacity: 0.95,
      radius: 7,
    };
  }

  return {
    color: "#64748b",
    weight: 1,
    fillOpacity: 0.05,
  };
}

function bindCyclonePopup(feature, layer) {
  const props = feature?.properties ?? {};
  const name = props.eventname ?? props.name ?? "Tropical Cyclone";
  const alert = props.alertlevel ?? "—";
  const severity = props.severitytext ?? props.polygonlabel ?? "";
  const source = props.source ?? "GDACS/JTWC";

  layer.bindPopup(
    `<div style="min-width:180px">
      <strong>${name}</strong><br/>
      Alert: ${alert}<br/>
      ${severity ? `${severity}<br/>` : ""}
      <span style="opacity:0.75">Source: ${source}</span>
    </div>`
  );
}

function pointToLayer(feature, latlng) {
  const cls = String(feature?.properties?.Class ?? "");
  const isCentroid = cls === "Point_Centroid";
  return L.circleMarker(latlng, {
    radius: isCentroid ? 7 : 4,
    ...cycloneStyle(feature),
  });
}

export default function CycloneTrackLayer({ overlayId }) {
  const map = useMap();
  const layerRef = useRef(null);
  const refreshTimerRef = useRef(null);

  useEffect(() => {
    if (layerRef.current) {
      map.removeLayer(layerRef.current);
      layerRef.current = null;
    }
    if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }

    if (overlayId !== MAP_WEATHER_OVERLAY_TYPHOON_TRACK) {
      return undefined;
    }

    let cancelled = false;

    async function loadTracks() {
      const res = await fetch("/api/weather/cyclones");
      const data = await res.json();
      if (cancelled || !res.ok || !data?.features) return;

      if (layerRef.current) {
        map.removeLayer(layerRef.current);
      }

      const group = L.geoJSON(
        { type: "FeatureCollection", features: data.features },
        {
          style: cycloneStyle,
          pointToLayer,
          onEachFeature: bindCyclonePopup,
        }
      );

      group.addTo(map);
      layerRef.current = group;
    }

    loadTracks().catch(() => {});

    refreshTimerRef.current = setInterval(() => {
      loadTracks().catch(() => {});
    }, 15 * 60 * 1000);

    return () => {
      cancelled = true;
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }
    };
  }, [map, overlayId]);

  return null;
}
