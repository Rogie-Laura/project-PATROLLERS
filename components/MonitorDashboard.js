"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase/client";
import MapToolbar from "@/components/MapToolbar";
import MonitorHeader from "@/components/MonitorHeader";
import CallResponsePanel from "@/components/CallResponsePanel";
import PatrolDetailPanel from "@/components/PatrolDetailPanel";
import PatrolStatusListPanel from "@/components/PatrolStatusListPanel";
import { DEFAULT_BASEMAP_ID } from "@/lib/mapBasemaps";
import { getUnitKey } from "@/lib/dispatchUnits";
import { callResponseFromRow } from "@/lib/callResponses";
import { radiusSlotsToMapRings, createDefaultRadiusRingSlots } from "@/lib/incidentRadiusRings";
import { useShowPatrolStatus } from "@/lib/useShowPatrolStatus";
import {
  clearCallResponseSession,
  useCallResponseSession,
} from "@/lib/useCallResponseSession";
import { staleThresholdMs } from "@/lib/connectionState";

const PatrolMap = dynamic(() => import("@/components/PatrolMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center bg-card text-muted">
      Loading map...
    </div>
  ),
});

function getLatestByPatrol(locations) {
  const latest = new Map();

  for (const loc of locations) {
    const key = loc.access_token_id || loc.user_id;
    if (!key) continue;

    const existing = latest.get(key);
    if (!existing || new Date(loc.created_at) > new Date(existing.created_at)) {
      latest.set(key, loc);
    }
  }

  return Array.from(latest.values());
}

export default function MonitorDashboard({ user, onLogout }) {
  const supabase = createClient();
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [signingOut, setSigningOut] = useState(false);
  const [basemapId, setBasemapId] = useState(DEFAULT_BASEMAP_ID);
  const [showPatrolStatus, setShowPatrolStatus] = useShowPatrolStatus();
  const [selectedPatrol, setSelectedPatrol] = useState(null);
  const [callResponseOpen, setCallResponseOpen] = useState(false);
  const [callResponsePlace, setCallResponsePlace] = useState(null);
  const [callResponses, setCallResponses] = useState([]);
  const [callResponsesLoaded, setCallResponsesLoaded] = useState(false);
  const {
    selectedCallId,
    setSelectedCallId,
    dispatchRoute,
    setDispatchRoute,
    highlightedUnitKey,
    setHighlightedUnitKey,
    hydrated: callUiHydrated,
  } = useCallResponseSession();
  const [flyToCallId, setFlyToCallId] = useState(null);
  const [intervalSeconds, setIntervalSeconds] = useState(1800);
  const [mapRadiusSlots, setMapRadiusSlots] = useState(createDefaultRadiusRingSlots);
  const [dispatchMaxRadiusM, setDispatchMaxRadiusM] = useState(6000);
  const [dispatchByCallId, setDispatchByCallId] = useState({});
  const [dispatchNotice, setDispatchNotice] = useState("");
  const [nowMs, setNowMs] = useState(() => Date.now());

  const incidentRadiusRings = useMemo(
    () => radiusSlotsToMapRings(mapRadiusSlots),
    [mapRadiusSlots]
  );

  // Units that pressed "Stop Tracking" disappear from the map and panels.
  const latestLocations = useMemo(
    () =>
      getLatestByPatrol(locations).filter(
        (loc) => loc.tracking_active !== false
      ),
    [locations]
  );

  const staleMs = useMemo(
    () => staleThresholdMs(intervalSeconds),
    [intervalSeconds]
  );

  const selectedPatrolKey = selectedPatrol
    ? selectedPatrol.access_token_id || selectedPatrol.user_id
    : null;

  const flyToCall = callResponses.find((c) => c.id === flyToCallId);

  const highlightedUnitLocation = useMemo(() => {
    if (!highlightedUnitKey) return null;
    return (
      latestLocations.find((loc) => getUnitKey(loc) === highlightedUnitKey) ??
      null
    );
  }, [highlightedUnitKey, latestLocations]);

  useEffect(() => {
    if (!selectedPatrolKey) return;
    const updated = latestLocations.find(
      (loc) => (loc.access_token_id || loc.user_id) === selectedPatrolKey
    );
    if (updated) setSelectedPatrol(updated);
  }, [latestLocations, selectedPatrolKey]);

  useEffect(() => {
    let active = true;

    fetch("/api/call-responses?status=active")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active || !data?.callResponses) return;
        setCallResponses(data.callResponses);
        setCallResponsesLoaded(true);
      })
      .catch(() => {
        if (active) setCallResponsesLoaded(true);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!callResponsesLoaded || !callUiHydrated) return;

    setSelectedCallId((prev) => {
      if (prev && callResponses.some((c) => c.id === prev)) return prev;
      return callResponses[0]?.id ?? null;
    });
  }, [callResponses, callResponsesLoaded, callUiHydrated, setSelectedCallId]);

  useEffect(() => {
    const channel = supabase
      .channel("call_responses_realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "call_responses" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const row = callResponseFromRow(payload.new);
            if (!row || row.status !== "active") return;
            setCallResponses((prev) => {
              if (prev.some((c) => c.id === row.id)) return prev;
              return [...prev, row];
            });
            return;
          }

          if (payload.eventType === "UPDATE") {
            const row = callResponseFromRow(payload.new);
            if (!row) return;
            if (row.status === "closed") {
              setCallResponses((prev) => {
                const next = prev.filter((c) => c.id !== row.id);
                setSelectedCallId((current) => {
                  if (current !== row.id) return current;
                  return next[0]?.id ?? null;
                });
                return next;
              });
              setDispatchRoute((route) =>
                route?.callId === row.id ? null : route
              );
              setHighlightedUnitKey(null);
              return;
            }
            setCallResponses((prev) => {
              const idx = prev.findIndex((c) => c.id === row.id);
              if (idx === -1) return [...prev, row];
              const next = [...prev];
              next[idx] = row;
              return next;
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, setSelectedCallId, setDispatchRoute, setHighlightedUnitKey]);

  useEffect(() => {
    let active = true;
    fetch("/api/system-settings/map")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active || !data) return;
        if (data.location_interval_seconds) {
          setIntervalSeconds(Number(data.location_interval_seconds));
        }
        if (data.incident_radius_rings) {
          setMapRadiusSlots(data.incident_radius_rings);
        }
        if (data.dispatch_max_radius_m) {
          setDispatchMaxRadiusM(Number(data.dispatch_max_radius_m));
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 15000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let active = true;

    async function loadLocations() {
      const { data, error: fetchError } = await supabase
        .from("location_updates")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);

      if (!active) return;

      if (fetchError) {
        setError(fetchError.message);
      } else {
        setLocations(data || []);
      }
      setLoading(false);
    }

    loadLocations();

    const channel = supabase
      .channel("location_updates_realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "location_updates" },
        (payload) => {
          const row = payload.new;
          if (!row) return;

          setLocations((prev) => [row, ...prev]);

          // Stop-tracking beacon: hide marker as soon as the INSERT arrives.
          if (row.tracking_active === false) {
            const unitKey = row.access_token_id || row.user_id;
            setSelectedPatrol((current) => {
              if (!current || !unitKey) return current;
              const currentKey = current.access_token_id || current.user_id;
              return currentKey === unitKey ? null : current;
            });
          }
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  async function loadDispatchesForCall(callId) {
    if (!callId) return;

    try {
      const res = await fetch(`/api/call-responses/${callId}/dispatch`);
      const data = await res.json();
      if (!res.ok) return;

      setDispatchByCallId((prev) => ({
        ...prev,
        [callId]: data.dispatches ?? [],
      }));
    } catch {
      // Non-blocking refresh for dispatch badges.
    }
  }

  async function alertNearbyUnits(callId) {
    setDispatchNotice("");

    const res = await fetch(`/api/call-responses/${callId}/dispatch`, {
      method: "POST",
    });
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error ?? "Could not alert mobile units.");
    }

    setDispatchByCallId((prev) => ({
      ...prev,
      [callId]: data.dispatches ?? [],
    }));
    setDispatchNotice(data.message ?? "Mobile units alerted.");

    return data;
  }

  useEffect(() => {
    if (!selectedCallId) return;
    loadDispatchesForCall(selectedCallId);
  }, [selectedCallId]);

  async function handleAddCallResponse(place) {
    setError("");

    try {
      const res = await fetch("/api/call-responses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          latitude: place.latitude,
          longitude: place.longitude,
          label: place.displayName,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Could not save call response.");
      }

      const entry = data.callResponse;
      setCallResponses((prev) => {
        if (prev.some((c) => c.id === entry.id)) return prev;
        return [...prev, entry];
      });
      setSelectedCallId(entry.id);
      setFlyToCallId(entry.id);
      setCallResponseOpen(false);
      setCallResponsePlace(null);
      setSelectedPatrol(null);
      setDispatchRoute(null);
      setHighlightedUnitKey(null);

      try {
        await alertNearbyUnits(entry.id);
      } catch (alertErr) {
        setError(
          alertErr.message ??
            "Incident saved, but nearby mobile units could not be alerted."
        );
      }
    } catch (err) {
      setError(err.message ?? "Could not save call response.");
    }
  }

  async function handleCloseCall(callId, { outcome, remarks }) {
    setError("");

    const res = await fetch(`/api/call-responses/${callId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "close", outcome, remarks }),
    });
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error ?? "Could not close incident.");
    }

    setCallResponses((prev) => {
      const next = prev.filter((c) => c.id !== callId);
      if (selectedCallId === callId) {
        const fallback = next[0]?.id ?? null;
        setSelectedCallId(fallback);
        setFlyToCallId(fallback);
      }
      return next;
    });
    setDispatchRoute((route) => (route?.callId === callId ? null : route));
    setHighlightedUnitKey(null);
    setDispatchByCallId((prev) => {
      const next = { ...prev };
      delete next[callId];
      return next;
    });
  }

  function handleHighlightUnit(unitKey) {
    setHighlightedUnitKey((prev) => (prev === unitKey ? null : unitKey));
  }

  function handleShowRoute(route) {
    setDispatchRoute(route);
    setHighlightedUnitKey(route.unitKey);
  }

  async function handleSignOut() {
    setSigningOut(true);
    clearCallResponseSession();
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    onLogout();
  }

  const hasActiveCalls =
    callResponsesLoaded && callUiHydrated && callResponses.length > 0;

  const activeCallId = selectedCallId ?? callResponses[0]?.id ?? null;
  const activeDispatches = activeCallId ? dispatchByCallId[activeCallId] ?? [] : [];

  return (
    <main className="flex h-dvh flex-col bg-background">
      <MonitorHeader
        user={user}
        onSignOut={handleSignOut}
        signingOut={signingOut}
      />

      <MapToolbar
        active="map"
        user={user}
        showBasemap
        basemapId={basemapId}
        onBasemapChange={setBasemapId}
        showAddCallResponse
        callResponseOpen={callResponseOpen}
        onCallResponseOpenChange={setCallResponseOpen}
        callResponsePlace={callResponsePlace}
        onCallResponsePlaceChange={setCallResponsePlace}
        onAddIncidentMarker={handleAddCallResponse}
        showPatrolStatus={showPatrolStatus}
        onShowPatrolStatusChange={(value) => {
          setShowPatrolStatus(value);
          if (!value) setSelectedPatrol(null);
        }}
      />

      <section className="relative min-h-0 flex-1">
        <div className="absolute inset-0">
          <PatrolMap
            locations={latestLocations}
            basemapId={basemapId}
            showPatrolStatus={showPatrolStatus}
            selectedPatrolKey={selectedPatrolKey}
            onSelectPatrol={setSelectedPatrol}
            callResponses={callResponses}
            selectedCallId={selectedCallId}
            flyToCall={flyToCall}
            highlightedUnitKey={highlightedUnitKey}
            highlightedUnitLocation={highlightedUnitLocation}
            dispatchRoute={dispatchRoute}
            incidentRadiusRings={incidentRadiusRings}
            nowMs={nowMs}
            staleThresholdMs={staleMs}
          />

          {error && (
            <div className="pointer-events-none absolute left-1/2 top-4 z-[500] max-w-sm -translate-x-1/2 rounded-lg border border-red-500/30 bg-card/95 px-4 py-2 text-center text-sm text-red-400 shadow-lg backdrop-blur-sm">
              {error}
            </div>
          )}
        </div>

        {hasActiveCalls && (
          <div className="pointer-events-none absolute inset-y-0 left-0 z-[500] w-[min(100%,380px)]">
            <div className="pointer-events-auto h-full w-full">
              <CallResponsePanel
                callResponses={callResponses}
                selectedCallId={activeCallId}
                onSelectCall={(id) => {
                  setSelectedCallId(id);
                  setFlyToCallId(id);
                  setDispatchRoute(null);
                  setDispatchNotice("");
                }}
                onCloseCall={handleCloseCall}
                latestLocations={latestLocations}
                highlightedUnitKey={highlightedUnitKey}
                onHighlightUnit={handleHighlightUnit}
                onShowRoute={handleShowRoute}
                dispatchRoute={dispatchRoute}
                dispatchMaxRadiusM={dispatchMaxRadiusM}
                dispatches={activeDispatches}
                dispatchNotice={dispatchNotice}
                onAlertNearbyUnits={async () => {
                  if (!activeCallId) return;
                  try {
                    await alertNearbyUnits(activeCallId);
                  } catch (err) {
                    setError(err.message ?? "Could not alert mobile units.");
                  }
                }}
              />
            </div>
          </div>
        )}

        {showPatrolStatus && !selectedPatrol && !hasActiveCalls && (
          <div className="pointer-events-none absolute inset-y-0 right-0 z-[500] w-[min(100%,340px)]">
            <div className="pointer-events-auto h-full w-full">
              <PatrolStatusListPanel
                locations={latestLocations}
                selectedPatrolKey={selectedPatrolKey}
                onSelectPatrol={setSelectedPatrol}
                nowMs={nowMs}
                intervalSeconds={intervalSeconds}
              />
            </div>
          </div>
        )}

        {selectedPatrol && !hasActiveCalls && (
          <div className="pointer-events-none absolute inset-y-0 right-0 z-[500] w-[min(100%,340px)]">
            <div className="pointer-events-auto h-full w-full">
              <PatrolDetailPanel
                location={selectedPatrol}
                showPatrolStatus={showPatrolStatus}
                nowMs={nowMs}
                intervalSeconds={intervalSeconds}
                onClose={() => {
                  setSelectedPatrol(null);
                }}
              />
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
