"use client";

import { useEffect, useMemo, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { DEFAULT_BASEMAP_ID, getBasemapById } from "@/lib/mapBasemaps";

const CALABARZON_CENTER = [14.2, 121.1];
const CALABARZON_ZOOM = 9;
const CALABARZON_BOUNDS = L.latLngBounds(
  [13.62, 120.7],
  [15.08, 122.4]
);

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

function CalabarzonInitialView() {
  const map = useMap();
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) return;

    map.fitBounds(CALABARZON_BOUNDS, { padding: [24, 24] });
    initializedRef.current = true;
  }, [map]);

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

export default function PatrolMap({ locations, basemapId = DEFAULT_BASEMAP_ID }) {
  const basemap = getBasemapById(basemapId);

  const parsedLocations = useMemo(
    () =>
      locations.map((loc) => ({
        ...loc,
        latitude: toNumber(loc.latitude),
        longitude: toNumber(loc.longitude),
      })),
    [locations]
  );

  return (
    <div className="relative h-full min-h-[400px] w-full">
      <MapContainer
        center={CALABARZON_CENTER}
        zoom={CALABARZON_ZOOM}
        className="h-full w-full"
        scrollWheelZoom
      >
        <TileLayer
          key={basemap.id}
          attribution={basemap.attribution}
          url={basemap.url}
        />

        <CalabarzonInitialView />

        {parsedLocations.map((loc, index) => (
          <PatrolMarker
            key={loc.access_token_id || loc.user_id || loc.id || index}
            location={loc}
          />
        ))}
      </MapContainer>
    </div>
  );
}
