"use client";

import { useEffect, useRef, useState } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet.heat";
import { getCellCoverageLayerById } from "@/lib/cellCoverageLayers";

function normalizePoints(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry) => {
      if (Array.isArray(entry)) {
        const lat = Number(entry[0]);
        const lng = Number(entry[1]);
        const intensity = entry.length > 2 ? Number(entry[2]) : 0.4;
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
        return [lat, lng, Number.isFinite(intensity) ? intensity : 0.4];
      }
      const lat = Number(entry.lat ?? entry.latitude);
      const lng = Number(entry.lng ?? entry.longitude);
      const intensity = Number(entry.intensity ?? entry.weight ?? 0.4);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
      return [lat, lng, Number.isFinite(intensity) ? intensity : 0.4];
    })
    .filter(Boolean);
}

function HeatLayerController({ layerId, enabled }) {
  const map = useMap();
  const heatRef = useRef(null);
  const [points, setPoints] = useState(null);
  const config = getCellCoverageLayerById(layerId);

  useEffect(() => {
    if (!enabled || !config) {
      setPoints(null);
      return undefined;
    }

    let cancelled = false;
    const controller = new AbortController();

    fetch(config.file, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then((payload) => {
        if (cancelled) return;
        setPoints(normalizePoints(payload.points ?? payload));
      })
      .catch(() => {
        if (!cancelled) setPoints([]);
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [enabled, config, layerId]);

  useEffect(() => {
    if (heatRef.current) {
      map.removeLayer(heatRef.current);
      heatRef.current = null;
    }

    if (!enabled || !points?.length) return undefined;

    const heatOptions = {
      minOpacity: 0.15,
      maxZoom: 17,
      ...config.heat,
    };

    const layer = L.heatLayer(points, heatOptions);
    layer.addTo(map);
    heatRef.current = layer;

    return () => {
      if (heatRef.current) {
        map.removeLayer(heatRef.current);
        heatRef.current = null;
      }
    };
  }, [map, enabled, points, config]);

  return null;
}

export default function CellCoverageMapLayers({ layers }) {
  return (
    <>
      {Object.entries(layers).map(([layerId, enabled]) =>
        enabled ? (
          <HeatLayerController key={layerId} layerId={layerId} enabled={enabled} />
        ) : null
      )}
    </>
  );
}
