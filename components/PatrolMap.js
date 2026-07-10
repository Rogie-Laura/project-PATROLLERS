"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Circle,
  Polyline,
  Tooltip,
  useMap,
} from "react-leaflet";
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
import {
  createPatrolMarkerIcon,
  getPatrolMarkerSizePx,
} from "@/lib/patrolMarker";
import { getPatrolUnitType } from "@/lib/patrolUnitTypes";
import {
  formatMonitorLinkSummary,
  getConnectionState,
} from "@/lib/connectionState";
import WeatherMapLayer from "@/components/WeatherMapLayer";
import CycloneTrackLayer from "@/components/CycloneTrackLayer";
import EstablishmentMapLayer from "@/components/EstablishmentMapLayer";
import TaalHazardMapLayer from "@/components/TaalHazardMapLayer";
import { MAP_WEATHER_OVERLAY_NONE } from "@/lib/mapWeatherOverlay";

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

function FlyToCallResponse({ callResponse }) {
  const map = useMap();

  useEffect(() => {
    if (!callResponse) return;

    const lat = toNumber(callResponse.latitude);
    const lng = toNumber(callResponse.longitude);
    if (Number.isNaN(lat) || Number.isNaN(lng)) return;

    map.flyTo([lat, lng], 12, { duration: 1 });
  }, [map, callResponse?.id]);

  return null;
}

function FlyToUnit({ location }) {
  const map = useMap();

  useEffect(() => {
    if (!location) return;
    const lat = toNumber(location.latitude);
    const lng = toNumber(location.longitude);
    if (Number.isNaN(lat) || Number.isNaN(lng)) return;
    map.flyTo([lat, lng], 14, { duration: 0.8 });
  }, [map, location]);

  return null;
}

/** Pans map when a patrol is chosen from the status list (not on marker click). */
function FlyToPatrol({ target }) {
  const map = useMap();

  useEffect(() => {
    if (!target) return;
    const lat = toNumber(target.latitude);
    const lng = toNumber(target.longitude);
    if (Number.isNaN(lat) || Number.isNaN(lng)) return;
    map.flyTo([lat, lng], 14, { duration: 0.8 });
  }, [map, target?.at]);

  return null;
}

function CallResponsesLayer({
  callResponses,
  selectedCallId,
  incidentRadiusRings = INCIDENT_RADIUS_RINGS,
}) {
  if (!callResponses?.length) return null;

  return (
    <>
      {callResponses.map((call) => {
        const lat = toNumber(call.latitude);
        const lng = toNumber(call.longitude);
        if (Number.isNaN(lat) || Number.isNaN(lng)) return null;

        const center = [lat, lng];
        const isSelected = call.id === selectedCallId;
        const icon = createIncidentMarkerIcon();

        return (
          <span key={call.id}>
            {incidentRadiusRings.map((ring) => (
              <Circle
                key={`${call.id}-${ring.radiusMeters}`}
                center={center}
                radius={ring.radiusMeters}
                pathOptions={{
                  color: ring.color,
                  fillColor: ring.color,
                  fillOpacity: isSelected
                    ? ring.fillOpacity
                    : ring.fillOpacity * 0.5,
                  weight: isSelected ? ring.weight : 1,
                }}
              />
            ))}
            <Marker
              position={center}
              icon={icon}
              zIndexOffset={isSelected ? 2000 : 1500}
            />
          </span>
        );
      })}
    </>
  );
}

function DispatchRouteLayer({ dispatchRoute }) {
  if (!dispatchRoute?.coordinates?.length) return null;

  return (
    <>
      <Polyline
        positions={dispatchRoute.coordinates}
        pathOptions={{
          color: "#1a73e8",
          weight: 8,
          opacity: 0.35,
          lineCap: "round",
          lineJoin: "round",
        }}
      />
      <Polyline
        positions={dispatchRoute.coordinates}
        pathOptions={{
          color: dispatchRoute.hasTraffic ? "#34a853" : "#4285f4",
          weight: 5,
          opacity: 0.95,
          lineCap: "round",
          lineJoin: "round",
        }}
      />
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

/** Keeps patrol marker icons in sync when the user zooms the map. */
function useMapZoomLevel() {
  const map = useMap();
  const [zoom, setZoom] = useState(() => map.getZoom());

  useEffect(() => {
    const sync = () => setZoom(map.getZoom());
    map.on("zoom zoomend", sync);
    return () => {
      map.off("zoom zoomend", sync);
    };
  }, [map]);

  return zoom;
}

function PatrolMarkersLayer({
  locations,
  showPatrolStatus,
  selectedPatrolKey,
  highlightedUnitKey,
  nowMs,
  intervalSeconds,
  onSelectPatrol,
}) {
  const mapZoom = useMapZoomLevel();

  return (
    <>
      {locations.map((loc, index) => {
        const key = patrolKey(loc) ?? index;
        const connectionState = getConnectionState(loc, nowMs, intervalSeconds);
        return (
          <PatrolMarker
            key={key}
            location={loc}
            showPatrolStatus={showPatrolStatus}
            connectionState={connectionState}
            mapZoom={mapZoom}
            isSelected={selectedPatrolKey != null && selectedPatrolKey === key}
            isDispatchHighlight={
              highlightedUnitKey != null && highlightedUnitKey === key
            }
            nowMs={nowMs}
            intervalSeconds={intervalSeconds}
            onSelect={onSelectPatrol}
          />
        );
      })}
    </>
  );
}

function PatrolMarker({
  location,
  showPatrolStatus,
  isSelected,
  isDispatchHighlight,
  connectionState,
  mapZoom,
  nowMs,
  intervalSeconds,
  onSelect,
}) {
  const markerRef = useRef(null);
  const latitude = toNumber(location.latitude);
  const longitude = toNumber(location.longitude);
  const position = [latitude, longitude];
  const markerSizePx = getPatrolMarkerSizePx(mapZoom);
  const patrolUnitType = getPatrolUnitType(location);
  const tooltip = formatMonitorLinkSummary(location, nowMs, intervalSeconds);
  const icon = useMemo(
    () =>
      createPatrolMarkerIcon(
        location.patrol_status,
        showPatrolStatus,
        connectionState,
        markerSizePx,
        patrolUnitType
      ),
    [
      location.patrol_status,
      showPatrolStatus,
      connectionState,
      markerSizePx,
      patrolUnitType,
    ]
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
      zIndexOffset={isDispatchHighlight ? 1100 : isSelected ? 1000 : 0}
      eventHandlers={{
        click: () => onSelect?.(location),
      }}
    >
      <Tooltip direction="top" offset={[0, -10]} opacity={0.95}>
        <span className="text-xs">{tooltip}</span>
      </Tooltip>
    </Marker>
  );
}

export default function PatrolMap({
  locations,
  basemapId = DEFAULT_BASEMAP_ID,
  showPatrolStatus = true,
  selectedPatrolKey = null,
  onSelectPatrol,
  callResponses = [],
  selectedCallId = null,
  flyToCall = null,
  flyToPatrol = null,
  highlightedUnitKey = null,
  highlightedUnitLocation = null,
  dispatchRoute = null,
  incidentRadiusRings = INCIDENT_RADIUS_RINGS,
  nowMs = Date.now(),
  locationIntervalSeconds = 180,
  weatherOverlay = MAP_WEATHER_OVERLAY_NONE,
  showEstablishments = false,
  establishments = [],
  taalHazardLayers = [],
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
        preferCanvas
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

        <WeatherMapLayer overlayId={weatherOverlay} />
        <CycloneTrackLayer overlayId={weatherOverlay} />
        <EstablishmentMapLayer
          enabled={showEstablishments}
          establishments={establishments}
        />
        <TaalHazardMapLayer layerIds={taalHazardLayers} />

        <CalabarzonInitialView />
        <SyncBasemapZoom maxZoom={basemap.maxZoom} />
        <InvalidateOnResize />
        <FlyToCallResponse callResponse={flyToCall} />
        <FlyToPatrol target={flyToPatrol} />
        <FlyToUnit location={highlightedUnitLocation} />
        <CallResponsesLayer
          callResponses={callResponses}
          selectedCallId={selectedCallId}
          incidentRadiusRings={incidentRadiusRings}
        />
        <DispatchRouteLayer dispatchRoute={dispatchRoute} />

        <PatrolMarkersLayer
          locations={parsedLocations}
          showPatrolStatus={showPatrolStatus}
          selectedPatrolKey={selectedPatrolKey}
          highlightedUnitKey={highlightedUnitKey}
          nowMs={nowMs}
          intervalSeconds={locationIntervalSeconds}
          onSelectPatrol={onSelectPatrol}
        />
      </MapContainer>
    </div>
  );
}
