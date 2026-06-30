"use client";

import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import { MAP_WEATHER_OVERLAY_TYPHOON_TRACK } from "@/lib/mapWeatherOverlay";

const TRACK_PURPLE = "#9333ea";
const TRACK_PURPLE_LIGHT = "#c084fc";

function cycloneStyle(feature) {
  const cls = String(feature?.properties?.Class ?? "");
  const isHistorical = String(feature?.properties?.iscurrent ?? "") !== "true";

  if (cls.startsWith("Line_Line")) {
    return {
      color: TRACK_PURPLE,
      weight: 3,
      opacity: isHistorical ? 0.55 : 0.95,
    };
  }

  if (cls === "Poly_Cones") {
    return {
      color: TRACK_PURPLE_LIGHT,
      weight: 2,
      dashArray: "6 4",
      fillColor: TRACK_PURPLE,
      fillOpacity: isHistorical ? 0.04 : 0.1,
      opacity: isHistorical ? 0.45 : 0.75,
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
      color: TRACK_PURPLE,
      weight: 2,
      fillColor: TRACK_PURPLE_LIGHT,
      fillOpacity: isHistorical ? 0.65 : 0.9,
      radius: 4,
    };
  }

  if (cls === "Point_Centroid") {
    return {
      color: "#7e22ce",
      weight: 2,
      fillColor: TRACK_PURPLE,
      fillOpacity: 0.95,
      radius: 8,
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
  const status =
    String(props.iscurrent ?? "") === "true" ? "Active" : "Historical / ended";

  layer.bindPopup(
    `<div style="min-width:180px">
      <strong>${name}</strong><br/>
      Status: ${status}<br/>
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
    radius: isCentroid ? 8 : 4,
    ...cycloneStyle(feature),
  });
}

function createStatusControl(message, hasTracks) {
  const control = L.control({ position: "bottomleft" });

  control.onAdd = () => {
    const el = L.DomUtil.create("div", "cyclone-track-status");
    el.style.cssText =
      "margin:0 0 12px 12px;max-width:min(360px,calc(100vw - 24px));padding:8px 12px;border-radius:8px;font:12px/1.4 system-ui,sans-serif;pointer-events:none;z-index:800;";
    el.style.background = hasTracks
      ? "rgba(15,23,42,0.88)"
      : "rgba(120,53,15,0.92)";
    el.style.color = "#f8fafc";
    el.style.border = hasTracks
      ? "1px solid rgba(147,51,234,0.45)"
      : "1px solid rgba(251,191,36,0.45)";
    el.textContent = message;
    return el;
  };

  return control;
}

export default function CycloneTrackLayer({ overlayId }) {
  const map = useMap();
  const layerRef = useRef(null);
  const statusControlRef = useRef(null);
  const refreshTimerRef = useRef(null);

  useEffect(() => {
    if (layerRef.current) {
      map.removeLayer(layerRef.current);
      layerRef.current = null;
    }
    if (statusControlRef.current) {
      map.removeControl(statusControlRef.current);
      statusControlRef.current = null;
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
      if (cancelled || !res.ok) return;

      if (layerRef.current) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }
      if (statusControlRef.current) {
        map.removeControl(statusControlRef.current);
        statusControlRef.current = null;
      }

      const features = Array.isArray(data?.features) ? data.features : [];
      const message =
        data?.meta?.message ??
        (features.length === 0
          ? "Walang cyclone track na available mula sa GDACS."
          : "Typhoon track overlay (GDACS/JTWC).");

      const statusControl = createStatusControl(message, features.length > 0);
      statusControl.addTo(map);
      statusControlRef.current = statusControl;

      if (features.length === 0) return;

      const group = L.geoJSON(
        { type: "FeatureCollection", features },
        {
          style: cycloneStyle,
          pointToLayer,
          onEachFeature: bindCyclonePopup,
        }
      );

      group.addTo(map);
      layerRef.current = group;

      try {
        const bounds = group.getBounds();
        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [48, 48], maxZoom: 7 });
        }
      } catch {
        /* ignore invalid bounds */
      }
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
      if (statusControlRef.current) {
        map.removeControl(statusControlRef.current);
        statusControlRef.current = null;
      }
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
        layerRef.current = null;
      }
    };
  }, [map, overlayId]);

  return null;
}
