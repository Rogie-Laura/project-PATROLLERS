"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Circle,
  Polyline,
  Popup,
  useMap,
} from "react-leaflet";
import { createCheckpointIcon } from "@/lib/cordonMapIcons";
import {
  createIncidentMarkerIcon,
  INCIDENT_RADIUS_RINGS,
} from "@/lib/incidentMarker";
import { DEFAULT_BASEMAP_ID, getBasemapById } from "@/lib/mapBasemaps";
import {
  CALABARZON_BOUNDS,
  CALABARZON_CENTER,
  CALABARZON_ZOOM,
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

function FlyToIncident({ incidentMarker }) {
  const map = useMap();

  useEffect(() => {
    if (!incidentMarker) return;

    const lat = toNumber(incidentMarker.latitude);
    const lng = toNumber(incidentMarker.longitude);
    if (Number.isNaN(lat) || Number.isNaN(lng)) return;

    map.flyTo([lat, lng], 11, { duration: 1.2 });
  }, [map, incidentMarker]);

  return null;
}

function IncidentMarkerLayer({ incidentMarker }) {
  if (!incidentMarker) return null;

  const lat = toNumber(incidentMarker.latitude);
  const lng = toNumber(incidentMarker.longitude);
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;

  const center = [lat, lng];
  const icon = createIncidentMarkerIcon();

  return (
    <>
      {INCIDENT_RADIUS_RINGS.map((ring) => (
        <Circle
          key={ring.radiusMeters}
          center={center}
          radius={ring.radiusMeters}
          pathOptions={{
            color: ring.color,
            fillColor: ring.color,
            fillOpacity: ring.fillOpacity,
            weight: ring.weight,
          }}
        />
      ))}
      <Marker position={center} icon={icon} zIndexOffset={2000} />
    </>
  );
}

function FlyToHighlightedCheckpoint({ cordonPlan, highlightedCheckpointId }) {
  const map = useMap();

  useEffect(() => {
    if (!highlightedCheckpointId || !cordonPlan?.checkpoints) return;

    const point = cordonPlan.checkpoints.find(
      (c) => c.id === highlightedCheckpointId
    );
    if (!point) return;

    map.flyTo([point.latitude, point.longitude], 14, { duration: 0.8 });
  }, [map, cordonPlan, highlightedCheckpointId]);

  return null;
}

function CordonOverlayLayer({
  cordonPlan,
  highlightedCheckpointId,
  onHighlightCheckpoint,
}) {
  if (!cordonPlan) return null;

  return (
    <>
      {cordonPlan.escapeRoutes?.map((route) => (
        <Polyline
          key={`escape-${route.id}`}
          positions={route.coordinates}
          pathOptions={{
            color: "#fb923c",
            weight: 4,
            opacity: 0.75,
            dashArray: "10 8",
          }}
        />
      ))}

      {cordonPlan.checkpoints?.map((point) => {
        const isHighlighted = highlightedCheckpointId === point.id;
        const icon = createCheckpointIcon(point.priority, isHighlighted);

        return (
          <Marker
            key={`checkpoint-${point.id}`}
            position={[point.latitude, point.longitude]}
            icon={icon}
            zIndexOffset={isHighlighted ? 1500 : 1200}
            eventHandlers={{
              click: () => onHighlightCheckpoint?.(point.id),
            }}
          >
            <Popup>
              <div className="text-xs">
                <strong>{point.label}</strong>
                <br />
                Priority: {point.priority} · {point.zone} ({point.distanceLabel})
              </div>
            </Popup>
          </Marker>
        );
      })}
    </>
  );
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
  incidentMarker = null,
  cordonPlan = null,
  highlightedCheckpointId = null,
  onHighlightCheckpoint,
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

        <CalabarzonInitialView />
        <SyncBasemapZoom maxZoom={basemap.maxZoom} />
        <InvalidateOnResize />
        <FlyToIncident incidentMarker={incidentMarker} />
        <IncidentMarkerLayer incidentMarker={incidentMarker} />
        <FlyToHighlightedCheckpoint
          cordonPlan={cordonPlan}
          highlightedCheckpointId={highlightedCheckpointId}
        />
        <CordonOverlayLayer
          cordonPlan={cordonPlan}
          highlightedCheckpointId={highlightedCheckpointId}
          onHighlightCheckpoint={onHighlightCheckpoint}
        />

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
