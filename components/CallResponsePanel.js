"use client";

import { useEffect, useMemo, useState } from "react";
import {
  formatEtaMinutes,
  rankNearbyUnits,
} from "@/lib/dispatchUnits";
import { formatDistanceKm } from "@/lib/geo";
import {
  formatStepDistance,
  formatStepDuration,
} from "@/lib/formatRoute";
import { getDispatchResultLabel } from "@/lib/callResponseDispatches";

const ZONE_STYLES = {
  "1km": "bg-red-500/20 text-red-300 border-red-500/40",
  "3km": "bg-amber-500/15 text-amber-200 border-amber-500/35",
  "6km": "bg-slate-500/15 text-slate-300 border-slate-500/40",
};

function formatDispatchTime(iso) {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

async function fetchDrivingRoute(fromLat, fromLon, toLat, toLon) {
  const res = await fetch("/api/route/directions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fromLat, fromLon, toLat, toLon }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Route failed");
  return data;
}

export default function CallResponsePanel({
  callResponses,
  selectedCallId,
  onSelectCall,
  onCloseCall,
  onCancelCall,
  latestLocations,
  highlightedUnitKey,
  onHighlightUnit,
  onShowRoute,
  dispatchRoute,
  dispatchMaxRadiusM = 6000,
  dispatches = [],
  dispatchNotice = "",
  onDispatchUnit,
}) {
  const selectedCall = callResponses.find((c) => c.id === selectedCallId);
  const availableUnits = useMemo(() => {
    if (!selectedCall) return [];
    const units = latestLocations.filter(
      (loc) => loc.access_token_id && loc.live_tracking_active !== false
    );
    return rankNearbyUnits(selectedCall, units, Number.MAX_SAFE_INTEGER);
  }, [selectedCall, latestLocations]);

  const [routeByUnit, setRouteByUnit] = useState({});
  const [showCloseForm, setShowCloseForm] = useState(false);
  const [closing, setClosing] = useState(false);
  const [closeError, setCloseError] = useState("");
  const [dispatchingKey, setDispatchingKey] = useState(null);

  const dispatchByRole = useMemo(() => {
    const map = new Map();
    // dispatches arrive newest-first; keep the newest entry per unit+role.
    for (const entry of dispatches) {
      if (!entry?.accessTokenId || !entry?.role) continue;
      const key = `${entry.accessTokenId}:${entry.role}`;
      if (!map.has(key)) map.set(key, entry);
    }
    return map;
  }, [dispatches]);

  useEffect(() => {
    setShowCloseForm(false);
    setCloseError("");
  }, [selectedCallId]);

  useEffect(() => {
    setRouteByUnit({});
  }, [selectedCallId]);

  useEffect(() => {
    if (!selectedCall) return;

    const topUnits = availableUnits.slice(0, 8);
    if (topUnits.length === 0) return;

    let cancelled = false;

    topUnits.forEach((unit) => {
      setRouteByUnit((prev) => ({
        ...prev,
        [unit.key]: { ...prev[unit.key], loading: true },
      }));

      fetchDrivingRoute(
        Number(unit.location.latitude),
        Number(unit.location.longitude),
        selectedCall.latitude,
        selectedCall.longitude
      )
        .then((route) => {
          if (cancelled) return;
          const etaSeconds =
            route.durationInTrafficSeconds ?? route.durationSeconds;
          setRouteByUnit((prev) => ({
            ...prev,
            [unit.key]: {
              loading: false,
              ...route,
              distanceLabel: formatDistanceKm(route.distanceMeters),
              etaLabel: formatEtaMinutes(etaSeconds),
              etaClearLabel: formatEtaMinutes(route.durationSeconds),
            },
          }));
        })
        .catch(() => {
          if (cancelled) return;
          setRouteByUnit((prev) => ({
            ...prev,
            [unit.key]: { loading: false, error: true },
          }));
        });
    });

    return () => {
      cancelled = true;
    };
  }, [selectedCallId, latestLocations, selectedCall, availableUnits]);

  function dispatchStatusLabel(entry) {
    if (!entry) return null;
    if (entry.status === "arrived") return "Arrived";
    if (entry.status === "accepted") return "Acknowledged";
    if (entry.status === "pending") return "Sent";
    return null;
  }

  function isActiveDispatch(entry) {
    return (
      entry &&
      (entry.status === "pending" ||
        entry.status === "accepted" ||
        entry.status === "arrived")
    );
  }

  async function handleDispatchUnit(unit, role) {
    if (!onDispatchUnit || !selectedCall || !unit.location.access_token_id) return;

    const dispatchKey = `${unit.location.access_token_id}:${role}`;
    setDispatchingKey(dispatchKey);

    try {
      await onDispatchUnit(
        selectedCall.id,
        unit.location.access_token_id,
        role,
        unit.distanceMeters
      );
    } finally {
      setDispatchingKey(null);
    }
  }

  const showDirections =
    dispatchRoute &&
    dispatchRoute.callId === selectedCallId &&
    dispatchRoute.steps?.length > 0;

  const hasArrived = dispatches.some((entry) => entry?.status === "arrived");

  async function handleCancelResponse() {
    if (!selectedCall) return;
    const confirmed = window.confirm(
      "Cancel this response? All alerted mobile units will be notified and their alarms will stop."
    );
    if (!confirmed) return;

    setClosing(true);
    setCloseError("");

    try {
      await onCancelCall?.(selectedCall.id);
      setShowCloseForm(false);
    } catch (err) {
      setCloseError(err.message ?? "Could not cancel response.");
    } finally {
      setClosing(false);
    }
  }

  async function handleConfirmClose() {
    if (!selectedCall) return;
    setClosing(true);
    setCloseError("");

    try {
      await onCloseCall?.(selectedCall.id);
      setShowCloseForm(false);
    } catch (err) {
      setCloseError(err.message ?? "Could not close incident.");
    } finally {
      setClosing(false);
    }
  }

  return (
    <aside className="flex h-full w-full max-w-[380px] flex-col border-r border-border/60 bg-card/95 backdrop-blur-sm">
      <div className="border-b border-border/60 px-4 py-3">
        <p className="text-[10px] font-medium uppercase tracking-wide text-red-400">
          Call response — dispatch assist
        </p>
        <h2 className="text-sm font-semibold text-foreground">
          Active incidents ({callResponses.length})
        </h2>
        <p className="mt-1 text-[10px] text-muted">
          Available mobile units — send respond or dragnet alert per unit.
        </p>
      </div>

      {callResponses.length > 1 && (
        <div className="flex gap-1 overflow-x-auto border-b border-border/60 px-2 py-2">
          {callResponses.map((call, index) => {
            const active = call.id === selectedCallId;
            return (
              <button
                key={call.id}
                type="button"
                onClick={() => onSelectCall(call.id)}
                className={`shrink-0 rounded-md px-2 py-1 text-[10px] font-medium transition ${
                  active
                    ? "bg-red-600 text-white"
                    : "bg-background/60 text-muted hover:text-foreground"
                }`}
              >
                #{index + 1}
              </button>
            );
          })}
        </div>
      )}

      {selectedCall && (
        <div className="border-b border-border/60 px-4 py-2">
          <p className="line-clamp-2 text-[11px] font-medium text-foreground">
            {selectedCall.label}
          </p>

          {dispatchNotice && (
            <p className="mt-2 text-[10px] text-accent">{dispatchNotice}</p>
          )}

          {!showCloseForm ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              <button
                type="button"
                disabled={closing}
                onClick={handleCancelResponse}
                className="rounded-md border border-amber-500/50 bg-amber-500/10 px-2.5 py-1 text-[10px] font-semibold text-amber-200 transition hover:bg-amber-500/20 disabled:opacity-50"
              >
                {closing ? "Cancelling…" : "Cancel Response"}
              </button>
              {hasArrived && (
                <button
                  type="button"
                  disabled={closing}
                  onClick={() => {
                    setShowCloseForm(true);
                    setCloseError("");
                  }}
                  className="rounded-md border border-red-500/40 bg-red-500/10 px-2.5 py-1 text-[10px] font-semibold text-red-300 transition hover:bg-red-500/20 disabled:opacity-50"
                >
                  Mark as Completed
                </button>
              )}
            </div>
          ) : (
            <div className="mt-2 space-y-2 rounded-lg border border-border/60 bg-background/50 p-2.5">
              <p className="text-[10px] text-muted">
                Confirm this incident response is complete?
              </p>

              {closeError && (
                <p className="text-[10px] text-red-400">{closeError}</p>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={closing}
                  onClick={() => {
                    setShowCloseForm(false);
                    setCloseError("");
                  }}
                  className="flex-1 rounded-md border border-border/60 px-2 py-1.5 text-[10px] font-medium text-muted hover:text-foreground"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={closing}
                  onClick={handleConfirmClose}
                  className="flex-1 rounded-md bg-red-600 px-2 py-1.5 text-[10px] font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {closing ? "Saving…" : "Confirm completed"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
        {!selectedCall && (
          <p className="py-4 text-center text-xs text-muted">
            Select an incident above.
          </p>
        )}

        {selectedCall && availableUnits.length === 0 && (
          <p className="py-4 text-center text-xs text-muted">
            No mobile units are currently tracking on the map.
          </p>
        )}

        {selectedCall && availableUnits.length > 0 && (
          <ul className="space-y-2">
            {availableUnits.map((unit, index) => {
              const route = routeByUnit[unit.key];
              const isHighlighted = highlightedUnitKey === unit.key;
              const isRouteActive =
                dispatchRoute?.unitKey === unit.key &&
                dispatchRoute?.callId === selectedCallId;
              const drivingDistance = route?.distanceLabel ?? unit.distanceLabel;
              const eta =
                route?.etaLabel ?? `~${unit.etaMinutesEstimate} min (est.)`;
              const tokenId = unit.location.access_token_id;
              const primaryDispatch = dispatchByRole.get(`${tokenId}:primary`);
              const cordonDispatch = dispatchByRole.get(`${tokenId}:cordon`);
              const primaryStatus = dispatchStatusLabel(primaryDispatch);
              const cordonStatus = dispatchStatusLabel(cordonDispatch);
              const dispatchingPrimary = dispatchingKey === `${tokenId}:primary`;
              const dispatchingCordon = dispatchingKey === `${tokenId}:cordon`;
              const hasActivePrimary = isActiveDispatch(primaryDispatch);
              const hasActiveCordon = isActiveDispatch(cordonDispatch);

              return (
                <li key={unit.key}>
                  <div
                    className={`rounded-lg border px-2.5 py-2 transition ${
                      isHighlighted || isRouteActive
                        ? "border-accent bg-accent/10"
                        : "border-border/60 bg-background/40"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold text-foreground">
                          {index + 1}. {unit.label}
                        </p>
                        {unit.location.mobile_plate &&
                          unit.location.patrol_name && (
                            <p className="text-[10px] text-muted">
                              {unit.location.mobile_plate}
                            </p>
                          )}
                      </div>
                      <span
                        className={`shrink-0 rounded border px-1 py-0.5 text-[9px] font-semibold ${
                          ZONE_STYLES[unit.zone] || ZONE_STYLES["6km"]
                        }`}
                      >
                        {unit.zone}
                      </span>
                    </div>

                    <div className="mt-2 grid grid-cols-2 gap-1">
                      <button
                        type="button"
                        disabled={dispatchingPrimary || hasActiveCordon}
                        onClick={() => handleDispatchUnit(unit, "primary")}
                        className="rounded border border-red-500/50 bg-red-500/10 px-2 py-1.5 text-[9px] font-semibold text-red-300 transition hover:bg-red-500/20 disabled:opacity-40"
                      >
                        {dispatchingPrimary
                          ? "Sending…"
                          : primaryStatus
                            ? `Respond · ${primaryStatus}`
                            : "Respond to incident"}
                      </button>
                      <button
                        type="button"
                        disabled={dispatchingCordon || hasActivePrimary}
                        onClick={() => handleDispatchUnit(unit, "cordon")}
                        className="rounded border border-amber-500/50 bg-amber-500/10 px-2 py-1.5 text-[9px] font-semibold text-amber-200 transition hover:bg-amber-500/20 disabled:opacity-40"
                      >
                        {dispatchingCordon
                          ? "Sending…"
                          : cordonStatus
                            ? `Dragnet · ${cordonStatus}`
                            : "Conduct dragnet"}
                      </button>
                    </div>

                    {[primaryDispatch, cordonDispatch]
                      .filter(
                        (entry) =>
                          isActiveDispatch(entry) ||
                          entry?.status === "completed"
                      )
                      .map((entry) => {
                        const ackTime = formatDispatchTime(entry.acknowledgedAt);
                        const arrivedTime = formatDispatchTime(entry.arrivedAt);
                        const closedTime = formatDispatchTime(entry.closedAt);
                        const arrivedLabel =
                          entry.role === "primary"
                            ? "Arrived at crime scene"
                            : "Arrived at position";
                        const resultLabel =
                          entry.status === "completed"
                            ? getDispatchResultLabel(
                                entry.result,
                                entry.resultNote
                              )
                            : null;
                        if (!ackTime && !arrivedTime && !resultLabel) {
                          return null;
                        }
                        return (
                          <div
                            key={entry.id}
                            className="mt-1.5 space-y-0.5 rounded border border-border/50 bg-background/40 px-2 py-1 text-[9px]"
                          >
                            {ackTime && (
                              <div className="flex items-center gap-1 text-emerald-300">
                                <span className="font-semibold">Acknowledged</span>
                                <span className="text-muted">· {ackTime}</span>
                              </div>
                            )}
                            {arrivedTime && (
                              <div className="flex items-center gap-1 text-sky-300">
                                <span className="font-semibold">{arrivedLabel}</span>
                                <span className="text-muted">· {arrivedTime}</span>
                              </div>
                            )}
                            {resultLabel && (
                              <div className="flex items-start gap-1 text-amber-300">
                                <span className="shrink-0 font-semibold">
                                  Resolved
                                </span>
                                <span className="text-muted">
                                  · {resultLabel}
                                  {closedTime ? ` (${closedTime})` : ""}
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })}

                    <dl className="mt-1.5 grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10px]">
                      <dt className="text-muted">Distance</dt>
                      <dd className="text-right font-medium text-foreground">
                        {route?.loading ? "…" : drivingDistance}
                      </dd>
                      <dt className="text-muted">
                        {route?.hasTraffic ? "ETA (traffic)" : "ETA (drive)"}
                      </dt>
                      <dd className="text-right font-medium text-accent">
                        {route?.loading ? "…" : eta}
                      </dd>
                      {route?.hasTraffic && route?.etaClearLabel && (
                        <>
                          <dt className="text-muted">Without traffic</dt>
                          <dd className="text-right text-muted">
                            {route.etaClearLabel}
                          </dd>
                        </>
                      )}
                    </dl>

                    {route?.trafficNote && !route?.loading && (
                      <p className="mt-1 text-[9px] leading-snug text-amber-200/90">
                        {route.trafficNote}
                      </p>
                    )}

                    <div className="mt-2 flex gap-1">
                      <button
                        type="button"
                        onClick={() => onHighlightUnit?.(unit.key)}
                        className="flex-1 rounded border border-border/60 px-2 py-1 text-[10px] font-medium text-foreground hover:bg-background/80"
                      >
                        Focus unit
                      </button>
                      <button
                        type="button"
                        disabled={route?.loading || !route?.coordinates?.length}
                        onClick={() =>
                          onShowRoute?.({
                            callId: selectedCall.id,
                            unitKey: unit.key,
                            label: unit.label,
                            coordinates: route.coordinates,
                            steps: route.steps ?? [],
                            hasTraffic: route.hasTraffic,
                            provider: route.provider,
                            trafficNote: route.trafficNote,
                          })
                        }
                        className={`flex-1 rounded border px-2 py-1 text-[10px] font-medium transition disabled:opacity-40 ${
                          isRouteActive
                            ? "border-[#4285f4] bg-[#4285f4]/20 text-[#8ab4f8]"
                            : "border-accent/50 bg-accent/10 text-accent hover:bg-accent/20"
                        }`}
                      >
                        {isRouteActive ? "Route on map" : "Show route"}
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {showDirections && (
          <div className="mt-3 border-t border-border/60 pt-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h3 className="text-[11px] font-semibold uppercase tracking-wide text-[#8ab4f8]">
                Turn-by-turn — {dispatchRoute.label}
              </h3>
              {dispatchRoute.hasTraffic && (
                <span className="shrink-0 rounded bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-medium text-amber-200">
                  Traffic ETA
                </span>
              )}
            </div>

            <div className="mb-2 flex gap-2 text-[9px] text-muted">
              <span className="flex items-center gap-1">
                <span className="inline-block h-1 w-4 rounded bg-[#4285f4]" />
                Route
              </span>
              {dispatchRoute.hasTraffic && (
                <span className="flex items-center gap-1">
                  <span className="inline-block h-1 w-4 rounded bg-[#34a853]" />
                  With traffic data
                </span>
              )}
            </div>

            {dispatchRoute.trafficNote && (
              <p className="mb-2 text-[10px] text-amber-200/90">
                {dispatchRoute.trafficNote}
              </p>
            )}

            <ol className="max-h-48 space-y-1.5 overflow-y-auto rounded-md border border-border/50 bg-background/40 p-2">
              {dispatchRoute.steps.map((step, stepIndex) => (
                <li
                  key={`${dispatchRoute.unitKey}-step-${stepIndex}`}
                  className="flex gap-2 text-[10px] leading-snug"
                >
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#4285f4]/30 text-[9px] font-bold text-[#8ab4f8]">
                    {stepIndex + 1}
                  </span>
                  <span>
                    <span className="text-foreground">
                      {step.instruction || "Continue"}
                    </span>
                    <span className="mt-0.5 block text-muted">
                      {formatStepDistance(step.distanceMeters)} ·{" "}
                      {formatStepDuration(step.durationSeconds)}
                    </span>
                  </span>
                </li>
              ))}
            </ol>

            {!dispatchRoute.hasTraffic && (
              <p className="mt-2 text-[9px] text-muted">
                For live traffic like Google Maps, set{" "}
                <code className="text-accent">GOOGLE_MAPS_API_KEY</code> in
                Vercel env (Directions API enabled).
              </p>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
