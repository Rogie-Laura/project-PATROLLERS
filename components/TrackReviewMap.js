"use client";

import { useEffect, useMemo } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  Popup,
  CircleMarker,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import { DEFAULT_BASEMAP_ID, getBasemapById } from "@/lib/mapBasemaps";
import {
  CALABARZON_CENTER,
  CALABARZON_ZOOM,
  MAP_MIN_ZOOM,
  MAX_BOUNDS_VISCOSITY,
  PHILIPPINES_BOUNDS,
} from "@/lib/mapBounds";

function toNumber(value) {
  return typeof value === "number" ? value : parseFloat(value);
}

function endpointIcon(color) {
  return L.divIcon({
    className: "track-endpoint",
    html: `<div style="
      width: 16px;
      height: 16px;
      background: ${color};
      border: 3px solid #fff;
      border-radius: 50%;
      box-shadow: 0 2px 8px rgba(0,0,0,0.5);
    "></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
}

const startIcon = endpointIcon("#22c55e");
const endIcon = endpointIcon("#ef4444");
const TRACK_LINE_COLOR = "#facc15";
const TRACK_POINT_COLOR = "#3b82f6";

function FitToTrack({ positions }) {
  const map = useMap();

  useEffect(() => {
    if (positions.length === 0) return;

    if (positions.length === 1) {
      map.setView(positions[0], 16);
      return;
    }

    map.fitBounds(L.latLngBounds(positions), { padding: [40, 40] });
  }, [positions, map]);

  return null;
}

function InvalidateOnResize() {
  const map = useMap();

  useEffect(() => {
    const container = map.getContainer();
    let frame = null;
    let debounceTimer = null;

    const refresh = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        if (frame) cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => {
          map.invalidateSize({ pan: false });
        });
      }, 150);
    };

    const observer = new ResizeObserver(refresh);
    observer.observe(container);

    const timer = setTimeout(refresh, 250);
    window.addEventListener("resize", refresh);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", refresh);
      clearTimeout(timer);
      if (debounceTimer) clearTimeout(debounceTimer);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [map]);

  return null;
}

function SyncBasemapZoom({ maxZoom }) {
  const map = useMap();

  useEffect(() => {
    map.setMaxZoom(maxZoom);
    if (map.getZoom() > maxZoom) {
      map.setZoom(maxZoom);
    }
  }, [map, maxZoom]);

  return null;
}

export default function TrackReviewMap({
  points,
  basemapId = DEFAULT_BASEMAP_ID,
  showPatrolStatus = true,
}) {
  const basemap = getBasemapById(basemapId);
  const positions = useMemo(
    () =>
      points
        .map((p) => [toNumber(p.latitude), toNumber(p.longitude)])
        .filter(([lat, lng]) => !Number.isNaN(lat) && !Number.isNaN(lng)),
    [points]
  );

  const start = positions[0];
  const end = positions[positions.length - 1];

  return (
    <MapContainer
      center={CALABARZON_CENTER}
      zoom={CALABARZON_ZOOM}
      minZoom={MAP_MIN_ZOOM}
      maxZoom={basemap.maxZoom}
      maxBounds={PHILIPPINES_BOUNDS}
      maxBoundsViscosity={MAX_BOUNDS_VISCOSITY}
      className="h-full w-full"
      scrollWheelZoom
      worldCopyJump={false}
    >
      <TileLayer
        key={basemap.id}
        attribution={basemap.attribution}
        url={basemap.url}
        maxZoom={basemap.maxZoom}
        maxNativeZoom={basemap.maxNativeZoom}
        minZoom={MAP_MIN_ZOOM}
        noWrap
      />

      <FitToTrack positions={positions} />
      <SyncBasemapZoom maxZoom={basemap.maxZoom} />
      <InvalidateOnResize />

      {positions.length > 1 && (
        <Polyline
          positions={positions}
          pathOptions={{ color: TRACK_LINE_COLOR, weight: 2, opacity: 0.9 }}
        />
      )}

      {points.map((point, index) => {
        const lat = toNumber(point.latitude);
        const lng = toNumber(point.longitude);
        if (Number.isNaN(lat) || Number.isNaN(lng)) return null;

        const isEndpoint = index === 0 || index === points.length - 1;
        if (isEndpoint) return null;

        return (
          <CircleMarker
            key={point.id ?? index}
            center={[lat, lng]}
            radius={4}
            pathOptions={{
              color: "#ffffff",
              weight: 1,
              fillColor: TRACK_POINT_COLOR,
              fillOpacity: 0.95,
            }}
          >
            <Popup>
              <small>{new Date(point.created_at).toLocaleString()}</small>
              {showPatrolStatus && point.patrol_status && (
                <>
                  <br />
                  <small>Status: {point.patrol_status}</small>
                </>
              )}
            </Popup>
          </CircleMarker>
        );
      })}

      {start && (
        <Marker position={start} icon={startIcon}>
          <Popup>
            <strong>Start</strong>
            <br />
            <small>{new Date(points[0].created_at).toLocaleString()}</small>
          </Popup>
        </Marker>
      )}

      {end && positions.length > 1 && (
        <Marker position={end} icon={endIcon}>
          <Popup>
            <strong>Current location</strong>
            <br />
            <small>
              {new Date(points[points.length - 1].created_at).toLocaleString()}
            </small>
          </Popup>
        </Marker>
      )}
    </MapContainer>
  );
}
