"use client";

import { useEffect, useMemo, useRef } from "react";
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
import { getPatrolMarkerColor } from "@/lib/patrolMarker";
import {
  CALABARZON_CENTER,
  CALABARZON_ZOOM,
  MAP_MAX_ZOOM,
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
      maxZoom={MAP_MAX_ZOOM}
      maxBounds={PHILIPPINES_BOUNDS}
      maxBoundsViscosity={MAX_BOUNDS_VISCOSITY}
      className="h-full w-full"
      scrollWheelZoom
    >
      <TileLayer
        key={basemap.id}
        attribution={basemap.attribution}
        url={basemap.url}
      />

      <FitToTrack positions={positions} />

      {positions.length > 1 && (
        <Polyline
          positions={positions}
          pathOptions={{ color: "#22c55e", weight: 4, opacity: 0.85 }}
        />
      )}

      {points.map((point, index) => {
        const lat = toNumber(point.latitude);
        const lng = toNumber(point.longitude);
        if (Number.isNaN(lat) || Number.isNaN(lng)) return null;

        const isEndpoint = index === 0 || index === points.length - 1;
        if (isEndpoint) return null;

        const color = showPatrolStatus
          ? getPatrolMarkerColor(point.patrol_status)
          : "#22c55e";

        return (
          <CircleMarker
            key={point.id ?? index}
            center={[lat, lng]}
            radius={3}
            pathOptions={{
              color,
              fillColor: color,
              fillOpacity: 0.8,
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
            <strong>Latest</strong>
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
