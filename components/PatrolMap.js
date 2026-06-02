"use client";

import { useEffect, useMemo, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import { DEFAULT_BASEMAP_ID, getBasemapById } from "@/lib/mapBasemaps";
import {
  CALABARZON_BOUNDS,
  CALABARZON_CENTER,
  CALABARZON_ZOOM,
  MAP_MAX_ZOOM,
  MAP_MIN_ZOOM,
  MAX_BOUNDS_VISCOSITY,
  PHILIPPINES_BOUNDS,
} from "@/lib/mapBounds";
import {
  createPatrolMarkerIcon,
  getPatrolStatusLabel,
} from "@/lib/patrolMarker";

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

function PatrolMarker({ location, showPatrolStatus }) {
  const markerRef = useRef(null);
  const latitude = toNumber(location.latitude);
  const longitude = toNumber(location.longitude);
  const position = [latitude, longitude];
  const icon = useMemo(
    () => createPatrolMarkerIcon(location.patrol_status, showPatrolStatus),
    [location.patrol_status, showPatrolStatus]
  );

  useEffect(() => {
    const marker = markerRef.current;
    if (!marker) return;
    marker.setLatLng(position);
    marker.setIcon(icon);
  }, [latitude, longitude, icon]);

  return (
    <Marker ref={markerRef} position={position} icon={icon}>
      <Popup>
        <strong>{location.patrol_name || "Patrol"}</strong>
        <br />
        {showPatrolStatus && (
          <>
            Status: {getPatrolStatusLabel(location.patrol_status)}
            <br />
          </>
        )}
        Lat: {latitude.toFixed(6)}
        <br />
        Lng: {longitude.toFixed(6)}
        <br />
        <small>{new Date(location.created_at).toLocaleString()}</small>
      </Popup>
    </Marker>
  );
}

export default function PatrolMap({
  locations,
  basemapId = DEFAULT_BASEMAP_ID,
  showPatrolStatus = true,
}) {
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

        <CalabarzonInitialView />

        {parsedLocations.map((loc, index) => (
          <PatrolMarker
            key={loc.access_token_id || loc.user_id || loc.id || index}
            location={loc}
            showPatrolStatus={showPatrolStatus}
          />
        ))}
      </MapContainer>
    </div>
  );
}
