"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase/client";
import MapToolbar from "@/components/MapToolbar";
import MonitorHeader from "@/components/MonitorHeader";
import PatrolDetailPanel from "@/components/PatrolDetailPanel";
import IncidentCordonPanel from "@/components/IncidentCordonPanel";
import PatrolStatusListPanel from "@/components/PatrolStatusListPanel";
import { DEFAULT_BASEMAP_ID } from "@/lib/mapBasemaps";
import { loadCordonPlan } from "@/lib/loadCordonPlan";
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
  const [incidentMarker, setIncidentMarker] = useState(null);
  const [cordonPlan, setCordonPlan] = useState(null);
  const [cordonLoading, setCordonLoading] = useState(false);
  const [cordonError, setCordonError] = useState("");
  const [highlightedCheckpointId, setHighlightedCheckpointId] = useState(null);
  const [cordonRetryKey, setCordonRetryKey] = useState(0);

  const latestLocations = useMemo(
    () => getLatestByPatrol(locations),
    [locations]
  );

  const selectedPatrolKey = selectedPatrol
    ? selectedPatrol.access_token_id || selectedPatrol.user_id
    : null;

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

  useEffect(() => {
    if (!incidentMarker) {
      setCordonPlan(null);
      setCordonError("");
      setHighlightedCheckpointId(null);
      return;
    }

    let cancelled = false;
    setCordonLoading(true);
    setCordonError("");
    setCordonPlan(null);
    setHighlightedCheckpointId(null);

    loadCordonPlan(incidentMarker.latitude, incidentMarker.longitude)
      .then(({ plan, error }) => {
        if (cancelled) return;
        if (error) {
          setCordonError(error);
          return;
        }
        setCordonPlan(plan);
      })
      .catch(() => {
        if (!cancelled) {
          setCordonError("Could not load cordon suggestions. Tap Retry.");
        }
      })
      .finally(() => {
        if (!cancelled) setCordonLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [incidentMarker, cordonRetryKey]);

  function handleClearIncident() {
    setIncidentMarker(null);
    setCordonPlan(null);
    setCordonError("");
    setHighlightedCheckpointId(null);
    setCallResponsePlace(null);
  }

  async function handleSignOut() {
    setSigningOut(true);
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    onLogout();
  }

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
        onAddIncidentMarker={(place) => {
          setIncidentMarker({
            latitude: place.latitude,
            longitude: place.longitude,
            label: place.displayName,
          });
          setCallResponseOpen(false);
          setSelectedPatrol(null);
        }}
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
            incidentMarker={incidentMarker}
            cordonPlan={cordonPlan}
            highlightedCheckpointId={highlightedCheckpointId}
            onHighlightCheckpoint={setHighlightedCheckpointId}
          />

          {error && (
            <div className="pointer-events-none absolute left-1/2 top-4 z-[500] max-w-sm -translate-x-1/2 rounded-lg border border-red-500/30 bg-card/95 px-4 py-2 text-center text-sm text-red-400 shadow-lg backdrop-blur-sm">
              {error}
            </div>
          )}
        </div>

        {incidentMarker && (
          <div className="pointer-events-none absolute inset-y-0 left-0 z-[500] w-[min(100%,360px)]">
            <div className="pointer-events-auto h-full shadow-2xl">
              <IncidentCordonPanel
                incidentLabel={incidentMarker.label}
                cordonPlan={cordonPlan}
                loading={cordonLoading}
                error={cordonError}
                highlightedId={highlightedCheckpointId}
                onHighlight={setHighlightedCheckpointId}
                onClearIncident={handleClearIncident}
                onRetry={() => setCordonRetryKey((k) => k + 1)}
              />
            </div>
          </div>
        )}

        {showPatrolStatus && !selectedPatrol && !incidentMarker && (
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

        {selectedPatrol && (
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
