"use client";

import { useEffect, useMemo, useRef } from "react";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
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
import { createPatrolMarkerIcon } from "@/lib/patrolMarker";

function patrolKey(location) {
  return location.access_token_id || location.user_id || location.id;
}

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

function InvalidateOnResize() {
  const map = useMap();

  useEffect(() => {
    const container = map.getContainer();
    let frame = null;

    const refresh = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => map.invalidateSize());
    };

    const observer = new ResizeObserver(refresh);
    observer.observe(container);

    // Catch transitions/layout changes that don't trigger the observer immediately.
    const timer = setTimeout(refresh, 250);
    window.addEventListener("resize", refresh);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", refresh);
      clearTimeout(timer);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [map]);

  return null;
}

function PatrolMarker({
  location,
  showPatrolStatus,
  isSelected,
  onSelect,
}) {
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
    <Marker
      ref={markerRef}
      position={position}
      icon={icon}
      zIndexOffset={isSelected ? 1000 : 0}
      eventHandlers={{
        click: () => onSelect?.(location),
      }}
    />
  );
}

export default function PatrolMap({
  locations,
  basemapId = DEFAULT_BASEMAP_ID,
  showPatrolStatus = true,
  selectedPatrolKey = null,
  onSelectPatrol,
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
        <InvalidateOnResize />

        {parsedLocations.map((loc, index) => {
          const key = patrolKey(loc) ?? index;
          return (
            <PatrolMarker
              key={key}
              location={loc}
              showPatrolStatus={showPatrolStatus}
              isSelected={selectedPatrolKey != null && selectedPatrolKey === key}
              onSelect={onSelectPatrol}
            />
          );
        })}
      </MapContainer>
    </div>
  );
}
