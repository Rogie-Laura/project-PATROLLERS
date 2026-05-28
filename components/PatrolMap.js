"use client";

import { useEffect, useMemo, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";

const defaultCenter = [14.5995, 120.9842];

const patrolIcon = L.divIcon({
  className: "patrol-marker",
  html: `<div style="
    width: 18px;
    height: 18px;
    background: #22c55e;
    border: 3px solid #fff;
    border-radius: 50%;
    box-shadow: 0 2px 8px rgba(0,0,0,0.4);
  "></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

function toNumber(value) {
  return typeof value === "number" ? value : parseFloat(value);
}

function getPatrolFitKey(locations) {
  return locations
    .map((loc) => loc.user_id)
    .sort()
    .join(",");
}

function FitBoundsOnce({ locations, fitKey }) {
  const map = useMap();
  const lastFitKeyRef = useRef(null);

  useEffect(() => {
    if (locations.length === 0) return;
    if (lastFitKeyRef.current === fitKey) return;

    const bounds = L.latLngBounds(
      locations.map((loc) => [toNumber(loc.latitude), toNumber(loc.longitude)])
    );
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    lastFitKeyRef.current = fitKey;
  }, [locations, map, fitKey]);

  return null;
}

function PatrolMarker({ location }) {
  const markerRef = useRef(null);
  const latitude = toNumber(location.latitude);
  const longitude = toNumber(location.longitude);
  const position = [latitude, longitude];

  useEffect(() => {
    markerRef.current?.setLatLng(position);
  }, [latitude, longitude]);

  return (
    <Marker ref={markerRef} position={position} icon={patrolIcon}>
      <Popup>
        <strong>{location.patrol_name || "Patrol"}</strong>
        <br />
        Lat: {latitude.toFixed(6)}
        <br />
        Lng: {longitude.toFixed(6)}
        <br />
        <small>{new Date(location.created_at).toLocaleString()}</small>
      </Popup>
    </Marker>
  );
}

export default function PatrolMap({ locations }) {
  const parsedLocations = useMemo(
    () =>
      locations.map((loc) => ({
        ...loc,
        latitude: toNumber(loc.latitude),
        longitude: toNumber(loc.longitude),
      })),
    [locations]
  );

  const fitKey = useMemo(() => getPatrolFitKey(parsedLocations), [parsedLocations]);

  const center =
    parsedLocations.length > 0
      ? [parsedLocations[0].latitude, parsedLocations[0].longitude]
      : defaultCenter;

  return (
    <div className="h-full min-h-[400px] w-full">
      <MapContainer
        center={center}
        zoom={13}
        className="h-full w-full"
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {parsedLocations.length > 0 && (
          <FitBoundsOnce locations={parsedLocations} fitKey={fitKey} />
        )}

        {parsedLocations.map((loc) => (
          <PatrolMarker key={loc.user_id} location={loc} />
        ))}
      </MapContainer>
    </div>
  );
}
