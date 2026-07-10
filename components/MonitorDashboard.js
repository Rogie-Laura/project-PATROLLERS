"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase/client";
import MapToolbar from "@/components/MapToolbar";
import MonitorHeader from "@/components/MonitorHeader";
import CallResponsePanel from "@/components/CallResponsePanel";
import PatrolDetailPanel from "@/components/PatrolDetailPanel";
import { trackReviewHref } from "@/lib/trackReview";
import PatrolStatusListPanel from "@/components/PatrolStatusListPanel";
import PatrolStatusFloatingPanel from "@/components/PatrolStatusFloatingPanel";
import { DEFAULT_BASEMAP_ID } from "@/lib/mapBasemaps";
import { getUnitKey } from "@/lib/dispatchUnits";
import { callResponseFromRow } from "@/lib/callResponses";
import { radiusSlotsToMapRings, createDefaultRadiusRingSlots } from "@/lib/incidentRadiusRings";
import { useMapViewOptions } from "@/lib/useMapViewOptions";
import { useMapWeatherOverlay } from "@/lib/useMapWeatherOverlay";
import { useEstablishmentOverlay } from "@/lib/useEstablishmentOverlay";
import MapViewOverlays from "@/components/MapViewOverlays";
import {
  clearCallResponseSession,
  useCallResponseSession,
} from "@/lib/useCallResponseSession";
import {
  applyLocationInsertRow,
  filterActivePatrolLocations,
  locationUnitKey,
  removeLocationByKey,
} from "@/lib/monitorLocations";
import {
  filterLocationsForUser,
  isSameScope,
  isSubordinateScope,
  canSeeSubordinates,
} from "@/lib/auth/scope";
import IncidentOverviewPanel from "@/components/IncidentOverviewPanel";
import {
  canUseCommandFeature,
  COMMAND_FEATURE_KEYS,
  DEFAULT_COMMAND_FEATURE_FLAGS,
} from "@/lib/auth/commandFeatureFlags";
import { filterPatrolLocations } from "@/lib/patrolSearch";
import { usePatrolStatusPopout } from "@/lib/usePatrolStatusPopout";
import { dispatchFromRow } from "@/lib/callResponseDispatches";
import { SESSION_ENDED_MESSAGE } from "@/lib/auth/sessionPolicy";
import ForceLocationPanel from "@/components/ForceLocationPanel";
import GenerateReportPanel from "@/components/GenerateReportPanel";
import CommandBillingUnavailable from "@/components/CommandBillingUnavailable";
import { useCommandBillingGate } from "@/lib/useCommandBillingGate";

/** Full map refresh interval (backup if a Realtime message is missed). */
const MONITOR_LOCATIONS_REFRESH_MS = 90_000;

const PatrolMap = dynamic(() => import("@/components/PatrolMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center bg-card text-muted">
      Loading map...
    </div>
  ),
});

export default function MonitorDashboard({ user, onLogout }) {
  const supabase = createClient();
  const onLogoutRef = useRef(onLogout);
  onLogoutRef.current = onLogout;
  const { loading: billingGateLoading, blocked: billingBlocked, message: billingMessage } =
    useCommandBillingGate(user);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [signingOut, setSigningOut] = useState(false);
  const [basemapId, setBasemapId] = useState(DEFAULT_BASEMAP_ID);
  const { layers: mapViewLayers, setLayer: setMapViewLayer } = useMapViewOptions();
  const { weatherOverlay, setWeatherOverlay } = useMapWeatherOverlay();
  const [showEstablishments, setShowEstablishments] = useEstablishmentOverlay();
  const [establishments, setEstablishments] = useState([]);
  const [establishmentsLoading, setEstablishmentsLoading] = useState(false);
  const [establishmentsError, setEstablishmentsError] = useState(null);
  const showPatrolStatus = mapViewLayers.patrolStatus;
  const [selectedPatrol, setSelectedPatrol] = useState(null);

  const handleMapViewLayerChange = useCallback(
    (id, value) => {
      setMapViewLayer(id, value);
      if (id === "patrolStatus" && !value) {
        setSelectedPatrol(null);
      }
    },
    [setMapViewLayer]
  );
  const [callResponseOpen, setCallResponseOpen] = useState(false);
  const [callResponsePlace, setCallResponsePlace] = useState(null);
  const [callResponses, setCallResponses] = useState([]);
  const [callResponsesLoaded, setCallResponsesLoaded] = useState(false);
  // Read-only awareness for higher offices: incidents owned by subordinate
  // command levels (RCC sees all PCC/station incidents, PCC sees its stations).
  const [subordinateIncidents, setSubordinateIncidents] = useState([]);
  // Off by default = independent (higher office does NOT see subordinate panels).
  // Toggled from the View menu "Show all incident response".
  const [showAllIncidents, setShowAllIncidentsState] = useState(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("patrollers.map.showAllIncidents");
      if (raw === "1") setShowAllIncidentsState(true);
    } catch {
      /* ignore */
    }
  }, []);

  const setShowAllIncidents = useCallback((next) => {
    setShowAllIncidentsState((prev) => {
      const value = typeof next === "function" ? next(prev) : next;
      try {
        sessionStorage.setItem(
          "patrollers.map.showAllIncidents",
          value ? "1" : "0"
        );
      } catch {
        /* ignore */
      }
      return value;
    });
  }, []);
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
  const [intervalSeconds, setIntervalSeconds] = useState(180);
  const [mapRadiusSlots, setMapRadiusSlots] = useState(createDefaultRadiusRingSlots);
  const [dispatchMaxRadiusM, setDispatchMaxRadiusM] = useState(6000);
  const [commandFeatureFlags, setCommandFeatureFlags] = useState(
    DEFAULT_COMMAND_FEATURE_FLAGS
  );
  const [dispatchByCallId, setDispatchByCallId] = useState({});
  const [dispatchNotice, setDispatchNotice] = useState("");
  const [forceLocationOpen, setForceLocationOpen] = useState(false);
  const [generateReportOpen, setGenerateReportOpen] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (!showEstablishments) return undefined;

    let cancelled = false;
    setEstablishmentsLoading(true);
    setEstablishmentsError(null);

    fetch("/api/monitor/establishments")
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok || !data?.ok) {
          throw new Error(data?.error ?? "Unable to load establishments.");
        }
        if (cancelled) return;
        setEstablishments(Array.isArray(data.establishments) ? data.establishments : []);
      })
      .catch((fetchError) => {
        if (cancelled) return;
        setEstablishments([]);
        setEstablishmentsError(
          fetchError instanceof Error
            ? fetchError.message
            : "Unable to load establishments.",
        );
      })
      .finally(() => {
        if (!cancelled) setEstablishmentsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [showEstablishments]);

  const incidentRadiusRings = useMemo(
    () => radiusSlotsToMapRings(mapRadiusSlots),
    [mapRadiusSlots]
  );

  // Server returns units with live_tracking_active; keep last-known pin on map until Stop.
  // Scope markers to the signed-in role: PCC sees its office, SCC its office+unit,
  // RCC / System Administrator see the whole region.
  const latestLocations = useMemo(
    () =>
      filterActivePatrolLocations(filterLocationsForUser(user, locations)),
    [user, locations]
  );

  const selectedPatrolKey = selectedPatrol
    ? selectedPatrol.access_token_id || selectedPatrol.user_id
    : null;

  const [flyToPatrolTarget, setFlyToPatrolTarget] = useState(null);
  const [patrolSearchQuery, setPatrolSearchQuery] = useState("");

  const mapLocations = useMemo(
    () => filterPatrolLocations(latestLocations, patrolSearchQuery),
    [latestLocations, patrolSearchQuery]
  );

  const patrolSearchFilteredCount =
    patrolSearchQuery.trim().length >= 2 ? mapLocations.length : null;

  const handleSelectPatrol = useCallback((location) => {
    setSelectedPatrol(location);
  }, []);

  const handleSelectPatrolFromList = useCallback((location) => {
    setSelectedPatrol(location);
    if (!location) {
      setFlyToPatrolTarget(null);
      return;
    }
    setFlyToPatrolTarget({
      latitude: location.latitude,
      longitude: location.longitude,
      at: Date.now(),
    });
  }, []);

  const {
    detached: patrolStatusDetached,
    externalOpen: patrolStatusExternalOpen,
    popoutActive: patrolStatusPopoutActive,
    popoutBlocked: patrolStatusPopoutBlocked,
    openDetach: openPatrolStatusDetach,
    openExternal: openPatrolStatusExternal,
    closeDetach: closePatrolStatusDetach,
  } = usePatrolStatusPopout({
    enabled: showPatrolStatus,
    selectedPatrolKey,
    onSelectLocation: handleSelectPatrolFromList,
  });

  const [externalWindowHintDismissed, setExternalWindowHintDismissed] = useState(false);
  const mapAreaRef = useRef(null);
  const [mapAreaSize, setMapAreaSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!patrolStatusExternalOpen) {
      setExternalWindowHintDismissed(false);
    }
  }, [patrolStatusExternalOpen]);

  useEffect(() => {
    const el = mapAreaRef.current;
    if (!el) return undefined;

    const update = () => {
      setMapAreaSize({ width: el.clientWidth, height: el.clientHeight });
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

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
    if (!selectedPatrolKey) return;
    if (patrolSearchQuery.trim().length < 2) return;
    const stillVisible = mapLocations.some(
      (loc) => (loc.access_token_id || loc.user_id) === selectedPatrolKey
    );
    if (!stillVisible) setSelectedPatrol(null);
  }, [mapLocations, patrolSearchQuery, selectedPatrolKey]);

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

    // Read-only awareness of subordinate offices' active incidents.
    fetch("/api/monitor/incident-overview")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active || !data?.incidents) return;
        setSubordinateIncidents(data.incidents);
      })
      .catch(() => {});

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
            // Own incidents drive this account's interactive dispatch panel.
            if (isSameScope(user, row)) {
              setCallResponses((prev) => {
                if (prev.some((c) => c.id === row.id)) return prev;
                return [...prev, row];
              });
              return;
            }
            // A subordinate office's incident: notify + add to read-only list,
            // but never into this account's dispatch panel.
            if (isSubordinateScope(user, row)) {
              setSubordinateIncidents((prev) => {
                if (prev.some((c) => c.id === row.id)) return prev;
                return [row, ...prev];
              });
            }
            return;
          }

          if (payload.eventType === "UPDATE") {
            const row = callResponseFromRow(payload.new);
            if (!row) return;

            if (isSubordinateScope(user, row)) {
              setSubordinateIncidents((prev) => {
                if (row.status === "closed") {
                  return prev.filter((c) => c.id !== row.id);
                }
                const idx = prev.findIndex((c) => c.id === row.id);
                if (idx === -1) return [row, ...prev];
                const next = [...prev];
                next[idx] = row;
                return next;
              });
              return;
            }

            if (!isSameScope(user, row)) return;
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
  }, [supabase, user, setSelectedCallId, setDispatchRoute, setHighlightedUnitKey]);

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
        if (data.command_feature_flags) {
          setCommandFeatureFlags(data.command_feature_flags);
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

    function handleSessionEnded() {
      onLogoutRef.current?.({ message: SESSION_ENDED_MESSAGE });
    }

    async function loadLocations() {
      try {
        const res = await fetch("/api/monitor/locations");
        const data = await res.json();
        if (!active) return;

        if (res.status === 401) {
          handleSessionEnded();
          return;
        }

        if (!res.ok) {
          setError(data.error ?? "Could not load patrol locations.");
          return;
        }

        setError("");
        setLocations(data.locations ?? []);
      } catch {
        if (active) setError("Could not load patrol locations.");
      } finally {
        if (active) setLoading(false);
      }
    }

    loadLocations();

    const refreshId = setInterval(loadLocations, MONITOR_LOCATIONS_REFRESH_MS);

    const locationChannel = supabase
      .channel("location_updates_realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "location_updates" },
        (payload) => {
          const row = payload.new;
          if (!row) return;

          setLocations((prev) => applyLocationInsertRow(prev, row));

          if (row.tracking_active === false) {
            const unitKey = locationUnitKey(row);
            setSelectedPatrol((current) => {
              if (!current || !unitKey) return current;
              return locationUnitKey(current) === unitKey ? null : current;
            });
          }
        }
      )
      .subscribe();

    const presenceChannel = supabase
      .channel("mobile_presence_realtime")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "mobile_device_profiles" },
        (payload) => {
          const row = payload.new;
          if (!row?.access_token_id) return;

          if (row.live_tracking_active === false) {
            setLocations((prev) =>
              removeLocationByKey(prev, row.access_token_id)
            );
            setSelectedPatrol((current) => {
              if (!current) return current;
              return current.access_token_id === row.access_token_id
                ? null
                : current;
            });
            return;
          }

          if (!row.last_seen_at && row.duty_shifts == null && row.visibility_points == null) {
            return;
          }

          setLocations((prev) =>
            prev.map((loc) => {
              if (loc.access_token_id !== row.access_token_id) return loc;
              return {
                ...loc,
                ...(row.last_seen_at
                  ? { last_seen_at: row.last_seen_at }
                  : {}),
                ...(row.patrol_unit_type != null
                  ? { patrol_unit_type: row.patrol_unit_type }
                  : {}),
                ...(row.duty_shifts != null
                  ? { duty_shifts: row.duty_shifts }
                  : {}),
                ...(row.visibility_points != null
                  ? { visibility_points: row.visibility_points }
                  : {}),
                ...(row.personnel_on_board != null
                  ? { personnel_on_board: row.personnel_on_board }
                  : {}),
              };
            })
          );
        }
      )
      .subscribe();

    return () => {
      active = false;
      clearInterval(refreshId);
      supabase.removeChannel(locationChannel);
      supabase.removeChannel(presenceChannel);
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

  async function dispatchUnit(callId, accessTokenId, role, distanceMeters) {
    setDispatchNotice("");

    const res = await fetch(`/api/call-responses/${callId}/dispatch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        access_token_id: accessTokenId,
        role,
        distance_meters: distanceMeters,
      }),
    });
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error ?? "Could not alert mobile unit.");
    }

    setDispatchByCallId((prev) => ({
      ...prev,
      [callId]: data.dispatches ?? [],
    }));
    setDispatchNotice(data.message ?? "Mobile unit alerted.");

    return data;
  }

  useEffect(() => {
    if (!selectedCallId) return;
    loadDispatchesForCall(selectedCallId);
    const id = setInterval(
      () => loadDispatchesForCall(selectedCallId),
      5_000
    );
    return () => clearInterval(id);
  }, [selectedCallId]);

  useEffect(() => {
    const channel = supabase
      .channel("call_response_dispatches_realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "call_response_dispatches" },
        (payload) => {
          const row = payload.new ?? payload.old;
          const callId = row?.call_response_id;
          if (!callId) return;

          if (payload.eventType === "DELETE") {
            setDispatchByCallId((prev) => {
              const current = prev[callId] ?? [];
              return {
                ...prev,
                [callId]: current.filter((entry) => entry.id !== row.id),
              };
            });
            return;
          }

          const dispatch = dispatchFromRow(row);
          if (!dispatch) return;

          setDispatchByCallId((prev) => {
            const current = prev[callId] ?? [];
            const idx = current.findIndex((entry) => entry.id === dispatch.id);
            const next =
              idx === -1
                ? [dispatch, ...current]
                : current.map((entry, i) => (i === idx ? dispatch : entry));
            return { ...prev, [callId]: next };
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

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
    } catch (err) {
      setError(err.message ?? "Could not save call response.");
    }
  }

  async function handleCancelCall(callId) {
    setError("");

    const res = await fetch(`/api/call-responses/${callId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "cancel" }),
    });
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error ?? "Could not cancel response.");
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
    setDispatchNotice("Response cancelled. Mobile units notified.");
  }

  async function handleCloseCall(callId) {
    setError("");

    const res = await fetch(`/api/call-responses/${callId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "close" }),
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

  const dispatchEnabled = canUseCommandFeature(
    user?.role,
    COMMAND_FEATURE_KEYS.addCallResponse,
    commandFeatureFlags
  );
  const forceLocationEnabled = canUseCommandFeature(
    user?.role,
    COMMAND_FEATURE_KEYS.forceLocation,
    commandFeatureFlags
  );
  const generateReportEnabled = canUseCommandFeature(
    user?.role,
    COMMAND_FEATURE_KEYS.generateReport,
    commandFeatureFlags
  );

  const hasActiveCalls =
    dispatchEnabled &&
    callResponsesLoaded &&
    callUiHydrated &&
    callResponses.length > 0;

  const showOverview = canSeeSubordinates(user);

  const activeCallId = selectedCallId ?? callResponses[0]?.id ?? null;
  const activeDispatches = activeCallId ? dispatchByCallId[activeCallId] ?? [] : [];

  if (billingGateLoading) {
    return (
      <main className="flex h-dvh items-center justify-center bg-background">
        <div className="text-center">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          <p className="text-sm text-muted">Loading...</p>
        </div>
      </main>
    );
  }

  if (billingBlocked) {
    return (
      <CommandBillingUnavailable
        user={user}
        onSignOut={handleSignOut}
        signingOut={signingOut}
        message={billingMessage}
      />
    );
  }

  return (
    <main className="flex h-dvh flex-col overflow-hidden bg-background">
      <MonitorHeader
        user={user}
        onSignOut={handleSignOut}
        signingOut={signingOut}
        locations={latestLocations}
      />

      <MapToolbar
        active="map"
        user={user}
        showBasemap
        basemapId={basemapId}
        onBasemapChange={setBasemapId}
        showAddCallResponse={dispatchEnabled}
        showForceLocation={forceLocationEnabled}
        forceLocationOpen={forceLocationOpen}
        onForceLocationOpenChange={setForceLocationOpen}
        showGenerateReport={generateReportEnabled}
        generateReportOpen={generateReportOpen}
        onGenerateReportOpenChange={setGenerateReportOpen}
        callResponseOpen={callResponseOpen}
        onCallResponseOpenChange={setCallResponseOpen}
        callResponsePlace={callResponsePlace}
        onCallResponsePlaceChange={setCallResponsePlace}
        onAddIncidentMarker={handleAddCallResponse}
        mapViewLayers={mapViewLayers}
        onMapViewLayerChange={handleMapViewLayerChange}
        showAllIncidentsToggle={showOverview}
        allIncidentsChecked={showAllIncidents}
        allIncidentsCount={subordinateIncidents.length}
        onAllIncidentsChange={setShowAllIncidents}
        weatherOverlay={weatherOverlay}
        onWeatherOverlayChange={setWeatherOverlay}
        showEstablishments={showEstablishments}
        onShowEstablishmentsChange={setShowEstablishments}
        establishmentsLoading={establishmentsLoading}
        establishmentsCount={establishments.length}
        establishmentsError={establishmentsError}
        patrolLocations={latestLocations}
        onPatrolSearchSelect={handleSelectPatrolFromList}
        patrolSearchQuery={patrolSearchQuery}
        onPatrolSearchQueryChange={setPatrolSearchQuery}
        patrolSearchFilteredCount={patrolSearchFilteredCount}
      />

      <section className="relative min-h-0 flex-1 overflow-hidden">
        <div ref={mapAreaRef} className="absolute inset-0 overflow-hidden">
          <PatrolMap
            locations={mapLocations}
            basemapId={basemapId}
            showPatrolStatus={showPatrolStatus}
            selectedPatrolKey={selectedPatrolKey}
            onSelectPatrol={handleSelectPatrol}
            callResponses={callResponses}
            selectedCallId={selectedCallId}
            flyToCall={flyToCall}
            flyToPatrol={flyToPatrolTarget}
            highlightedUnitKey={highlightedUnitKey}
            highlightedUnitLocation={highlightedUnitLocation}
            dispatchRoute={dispatchRoute}
            incidentRadiusRings={incidentRadiusRings}
            nowMs={nowMs}
            locationIntervalSeconds={intervalSeconds}
            weatherOverlay={weatherOverlay}
            showEstablishments={showEstablishments}
            establishments={establishments}
          />

          {error && (
            <div className="pointer-events-none absolute left-1/2 top-4 z-[500] max-w-sm -translate-x-1/2 rounded-lg border border-red-500/30 bg-card/95 px-4 py-2 text-center text-sm text-red-400 shadow-lg backdrop-blur-sm">
              {error}
            </div>
          )}

          <MapViewOverlays
            layers={mapViewLayers}
            locations={mapLocations}
            nowMs={nowMs}
            intervalSeconds={intervalSeconds}
            mapAreaSize={mapAreaSize}
          />

          {forceLocationOpen && forceLocationEnabled && (
            <ForceLocationPanel
              locations={latestLocations}
              selectedLocation={selectedPatrol}
              onClose={() => setForceLocationOpen(false)}
            />
          )}

          {generateReportOpen && (
            <GenerateReportPanel onClose={() => setGenerateReportOpen(false)} />
          )}

          {showOverview && showAllIncidents && (
            <IncidentOverviewPanel
              incidents={subordinateIncidents}
              nowMs={nowMs}
              onClose={() => setShowAllIncidents(false)}
            />
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
                onCancelCall={handleCancelCall}
                latestLocations={latestLocations}
                highlightedUnitKey={highlightedUnitKey}
                onHighlightUnit={handleHighlightUnit}
                onShowRoute={handleShowRoute}
                dispatchRoute={dispatchRoute}
                dispatchMaxRadiusM={dispatchMaxRadiusM}
                dispatches={activeDispatches}
                dispatchNotice={dispatchNotice}
                onDispatchUnit={async (callId, accessTokenId, role, distanceMeters) => {
                  try {
                    await dispatchUnit(callId, accessTokenId, role, distanceMeters);
                  } catch (err) {
                    setError(err.message ?? "Could not alert mobile unit.");
                  }
                }}
              />
            </div>
          </div>
        )}

        {patrolStatusDetached && !patrolStatusExternalOpen && showPatrolStatus && (
          <PatrolStatusFloatingPanel
            locations={latestLocations}
            selectedPatrolKey={selectedPatrolKey}
            onSelectPatrol={handleSelectPatrolFromList}
            nowMs={nowMs}
            intervalSeconds={intervalSeconds}
            onDock={closePatrolStatusDetach}
            onOpenWindow={openPatrolStatusExternal}
            externalWindowActive={patrolStatusExternalOpen}
          />
        )}

        {patrolStatusExternalOpen &&
          showPatrolStatus &&
          !externalWindowHintDismissed && (
          <div className="pointer-events-auto absolute bottom-4 right-4 z-[500] max-w-[260px] rounded-lg border border-border/60 bg-card/95 pr-1 shadow-lg backdrop-blur-sm">
            <div className="flex items-start gap-1 px-3 py-2">
              <p className="min-w-0 flex-1 text-[11px] leading-snug text-muted">
                Patrol status is in a separate window. Use{" "}
                <span className="font-medium text-foreground">Dock</span> in that window&apos;s
                title bar, or close the window.
              </p>
              <button
                type="button"
                onClick={() => setExternalWindowHintDismissed(true)}
                className="shrink-0 rounded p-0.5 text-muted transition hover:bg-background/80 hover:text-foreground"
                aria-label="Dismiss reminder"
                title="Close reminder"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {showPatrolStatus &&
          !patrolStatusPopoutActive &&
          !selectedPatrol &&
          !hasActiveCalls && (
          <div className="pointer-events-none absolute inset-y-0 right-0 z-[500] w-[min(100%,340px)]">
            <div className="pointer-events-auto h-full w-full">
              <PatrolStatusListPanel
                locations={latestLocations}
                selectedPatrolKey={selectedPatrolKey}
                onSelectPatrol={handleSelectPatrolFromList}
                nowMs={nowMs}
                intervalSeconds={intervalSeconds}
                onDetach={openPatrolStatusDetach}
                detachBlocked={patrolStatusPopoutBlocked}
              />
            </div>
          </div>
        )}

        {selectedPatrol && (
          <div className="pointer-events-none absolute inset-y-0 right-0 z-[500] w-[min(100%,340px)]">
            <div className="pointer-events-auto h-full w-full">
              <PatrolDetailPanel
                location={selectedPatrol}
                showPatrolStatus={showPatrolStatus}
                nowMs={nowMs}
                intervalSeconds={intervalSeconds}
                onForceLocation={() => setForceLocationOpen(true)}
                reviewTrackHref={
                  selectedPatrolKey ? trackReviewHref(selectedPatrolKey) : null
                }
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
