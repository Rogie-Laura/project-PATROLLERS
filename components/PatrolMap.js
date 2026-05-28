"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";

const defaultCenter = [14.5995, 120.9842]; // Manila, Philippines

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

function FitBounds({ locations }) {
  const map = useMap();

  useEffect(() => {
    if (locations.length === 0) return;

    const bounds = L.latLngBounds(
      locations.map((loc) => [toNumber(loc.latitude), toNumber(loc.longitude)])
    );
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
  }, [locations, map]);

  return null;
}

export default function PatrolMap({ locations }) {
  const parsedLocations = locations.map((loc) => ({
    ...loc,
    latitude: toNumber(loc.latitude),
    longitude: toNumber(loc.longitude),
  }));

  const center =
    parsedLocations.length > 0
      ? [parsedLocations[0].latitude, parsedLocations[0].longitude]
      : defaultCenter;

  return (
    <div className="h-full min-h-[400px] w-full">
      <MapContainer
        key={`map-${parsedLocations.length}-${parsedLocations[0]?.id ?? "empty"}`}
        center={center}
        zoom={13}
        className="h-full w-full"
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {parsedLocations.length > 0 && <FitBounds locations={parsedLocations} />}

        {parsedLocations.map((loc) => (
          <Marker
            key={loc.id || loc.user_id}
            position={[loc.latitude, loc.longitude]}
            icon={patrolIcon}
          >
            <Popup>
              <strong>{loc.patrol_name || "Patrol"}</strong>
              <br />
              Lat: {loc.latitude.toFixed(6)}
              <br />
              Lng: {loc.longitude.toFixed(6)}
              <br />
              <small>{new Date(loc.created_at).toLocaleString()}</small>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
