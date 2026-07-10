"use client";

import { useEffect, useRef } from "react";
import { Circle, Tooltip, useMap } from "react-leaflet";
import {
  TAAL_DANGER_ZONE_RINGS,
  TAAL_MAIN_CRATER,
} from "@/lib/mapTaalDangerZones";

export default function TaalDangerZoneMapLayer({ enabled = false }) {
  const map = useMap();
  const didFitRef = useRef(false);

  useEffect(() => {
    if (!enabled) {
      didFitRef.current = false;
      return undefined;
    }

    if (didFitRef.current) return undefined;

    map.flyTo(
      [TAAL_MAIN_CRATER.latitude, TAAL_MAIN_CRATER.longitude],
      11,
      { duration: 0.8 },
    );
    didFitRef.current = true;
    return undefined;
  }, [enabled, map]);

  if (!enabled) return null;

  const center = [TAAL_MAIN_CRATER.latitude, TAAL_MAIN_CRATER.longitude];

  return (
    <>
      {TAAL_DANGER_ZONE_RINGS.map((ring) => (
        <Circle
          key={ring.id}
          center={center}
          radius={ring.radiusKm * 1000}
          pathOptions={{
            color: ring.color,
            weight: 2,
            opacity: 0.9,
            fillColor: ring.color,
            fillOpacity: ring.fillOpacity,
            dashArray: ring.id === "pdz4" ? undefined : "6 4",
          }}
        >
          <Tooltip sticky direction="top" opacity={0.95}>
            <strong>Taal Danger Zone — {ring.label}</strong>
            <br />
            {ring.description}
          </Tooltip>
        </Circle>
      ))}
      <Circle
        center={center}
        radius={350}
        pathOptions={{
          color: "#991b1b",
          weight: 2,
          fillColor: "#dc2626",
          fillOpacity: 0.85,
        }}
      >
        <Tooltip direction="top" opacity={0.95}>
          <strong>{TAAL_MAIN_CRATER.label}</strong>
        </Tooltip>
      </Circle>
    </>
  );
}
