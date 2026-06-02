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
import { createCallResponse, getUnitKey } from "@/lib/dispatchUnits";
import { useShowPatrolStatus } from "@/lib/useShowPatrolStatus";

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
  const [selectedCallId, setSelectedCallId] = useState(null);
  const [flyToCallId, setFlyToCallId] = useState(null);
  const [highlightedUnitKey, setHighlightedUnitKey] = useState(null);
  const [dispatchRoute, setDispatchRoute] = useState(null);

  const latestLocations = useMemo(
    () => getLatestByPatrol(locations),
    [locations]
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
    async function loadLocations() {
      const { data, error: fetchError } = await supabase
        .from("location_updates")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);

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
          setLocations((prev) => [payload.new, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  function handleAddCallResponse(place) {
    const entry = createCallResponse(place);
    setCallResponses((prev) => [...prev, entry]);
    setSelectedCallId(entry.id);
    setFlyToCallId(entry.id);
    setCallResponseOpen(false);
    setCallResponsePlace(null);
    setSelectedPatrol(null);
    setDispatchRoute(null);
    setHighlightedUnitKey(null);
  }

  function handleRemoveCall(callId) {
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
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    onLogout();
  }

  const hasActiveCalls = callResponses.length > 0;

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
          />

          {error && (
            <div className="pointer-events-none absolute left-1/2 top-4 z-[500] max-w-sm -translate-x-1/2 rounded-lg border border-red-500/30 bg-card/95 px-4 py-2 text-center text-sm text-red-400 shadow-lg backdrop-blur-sm">
              {error}
            </div>
          )}
        </div>

        {hasActiveCalls && (
          <div className="pointer-events-none absolute inset-y-0 left-0 z-[500] w-[min(100%,380px)]">
            <div className="pointer-events-auto h-full shadow-2xl">
              <CallResponsePanel
                callResponses={callResponses}
                selectedCallId={selectedCallId ?? callResponses[0]?.id}
                onSelectCall={(id) => {
                  setSelectedCallId(id);
                  setFlyToCallId(id);
                  setDispatchRoute(null);
                }}
                onRemoveCall={handleRemoveCall}
                latestLocations={latestLocations}
                highlightedUnitKey={highlightedUnitKey}
                onHighlightUnit={handleHighlightUnit}
                onShowRoute={handleShowRoute}
                dispatchRoute={dispatchRoute}
              />
            </div>
          </div>
        )}

        {showPatrolStatus && !selectedPatrol && !hasActiveCalls && (
          <div className="pointer-events-none absolute inset-y-0 right-0 z-[500] w-[min(100%,340px)]">
            <div className="pointer-events-auto h-full shadow-2xl">
              <PatrolStatusListPanel
                locations={latestLocations}
                selectedPatrolKey={selectedPatrolKey}
                onSelectPatrol={setSelectedPatrol}
              />
            </div>
          </div>
        )}

        {selectedPatrol && !hasActiveCalls && (
          <div className="pointer-events-none absolute inset-y-0 right-0 z-[500] w-[min(100%,340px)]">
            <div className="pointer-events-auto h-full shadow-2xl">
              <PatrolDetailPanel
                location={selectedPatrol}
                showPatrolStatus={showPatrolStatus}
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
