"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";

const CALABARZON_CENTER = [14.2, 121.1];
const CALABARZON_ZOOM = 9;
const CALABARZON_BOUNDS = L.latLngBounds(
  [13.62, 120.7],
  [15.08, 122.4]
);

const BASEMAPS = [
  {
    id: "street",
    label: "Street",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  },
  {
    id: "satellite",
    label: "Satellite",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution:
      '&copy; <a href="https://www.esri.com/">Esri</a>',
  },
  {
    id: "cartoDark",
    label: "Carto Dark",
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
  },
  {
    id: "cartoLight",
    label: "Carto Light",
    url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
  },
];

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

function MapBasemapToggle({ activeId, onChange }) {
  return (
    <div
      className="pointer-events-auto absolute bottom-2 left-1/2 z-[1000] flex max-w-[calc(100%-1rem)] -translate-x-1/2 flex-wrap items-center justify-center gap-0.5 rounded-lg border border-border/80 bg-card/95 p-0.5 shadow-md backdrop-blur-sm sm:max-w-none sm:flex-nowrap"
      role="group"
      aria-label="Map view selection"
    >
      {BASEMAPS.map((basemap) => {
        const active = basemap.id === activeId;

        return (
          <button
            key={basemap.id}
            type="button"
            onClick={() => onChange(basemap.id)}
            aria-pressed={active}
            className={`rounded-md px-1.5 py-1 text-[10px] font-medium leading-none transition sm:px-2 sm:text-[11px] ${
              active
                ? "bg-accent text-background shadow-sm"
                : "text-muted hover:bg-background/80 hover:text-foreground"
            }`}
          >
            {basemap.label}
          </button>
        );
      })}
    </div>
  );
}

export default function PatrolMap({ locations }) {
  const [activeBasemap, setActiveBasemap] = useState("street");
  const basemap =
    BASEMAPS.find((layer) => layer.id === activeBasemap) ?? BASEMAPS[0];

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

        {parsedLocations.map((loc) => (
          <PatrolMarker key={loc.user_id} location={loc} />
        ))}
      </MapContainer>

      <MapBasemapToggle activeId={activeBasemap} onChange={setActiveBasemap} />
    </div>
  );
}
