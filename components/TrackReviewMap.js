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

const CALABARZON_CENTER = [14.2, 121.1];
const CALABARZON_ZOOM = 9;

const BASEMAP = {
  url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
};

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

export default function TrackReviewMap({ points }) {
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
      className="h-full w-full"
      scrollWheelZoom
    >
      <TileLayer attribution={BASEMAP.attribution} url={BASEMAP.url} />

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

        return (
          <CircleMarker
            key={point.id ?? index}
            center={[lat, lng]}
            radius={3}
            pathOptions={{ color: "#22c55e", fillColor: "#22c55e", fillOpacity: 0.8 }}
          >
            <Popup>
              <small>{new Date(point.created_at).toLocaleString()}</small>
              {point.patrol_status && (
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
