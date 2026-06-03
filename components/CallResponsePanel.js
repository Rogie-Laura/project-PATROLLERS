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
import { CLOSURE_OUTCOMES } from "@/lib/callResponseOutcomes";

const ZONE_STYLES = {
  "1km": "bg-red-500/20 text-red-300 border-red-500/40",
  "3km": "bg-amber-500/15 text-amber-200 border-amber-500/35",
  "6km": "bg-slate-500/15 text-slate-300 border-slate-500/40",
};

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
  latestLocations,
  highlightedUnitKey,
  onHighlightUnit,
  onShowRoute,
  dispatchRoute,
  dispatchMaxRadiusM = 6000,
}) {
  const selectedCall = callResponses.find((c) => c.id === selectedCallId);
  const nearbyUnits = useMemo(() => {
    if (!selectedCall) return [];
    return rankNearbyUnits(selectedCall, latestLocations, dispatchMaxRadiusM);
  }, [selectedCall, latestLocations, dispatchMaxRadiusM]);

  const [routeByUnit, setRouteByUnit] = useState({});
  const [showCloseForm, setShowCloseForm] = useState(false);
  const [closureOutcome, setClosureOutcome] = useState(
    CLOSURE_OUTCOMES[0].value
  );
  const [closureRemarks, setClosureRemarks] = useState("");
  const [closing, setClosing] = useState(false);
  const [closeError, setCloseError] = useState("");

  useEffect(() => {
    setShowCloseForm(false);
    setClosureOutcome(CLOSURE_OUTCOMES[0].value);
    setClosureRemarks("");
    setCloseError("");
  }, [selectedCallId]);

  useEffect(() => {
    setRouteByUnit({});
  }, [selectedCallId]);

  useEffect(() => {
    if (!selectedCall) return;

    const topUnits = rankNearbyUnits(
      selectedCall,
      latestLocations,
      dispatchMaxRadiusM
    ).slice(0, 6);
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
  }, [selectedCallId, latestLocations, selectedCall, dispatchMaxRadiusM]);

  const showDirections =
    dispatchRoute &&
    dispatchRoute.callId === selectedCallId &&
    dispatchRoute.steps?.length > 0;

  async function handleConfirmClose() {
    if (!selectedCall) return;
    setClosing(true);
    setCloseError("");

    try {
      await onCloseCall?.(selectedCall.id, {
        outcome: closureOutcome,
        remarks: closureRemarks.trim(),
      });
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
          Left panel: nearest units, driving route &amp; turn-by-turn (Google-style).
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

          {!showCloseForm ? (
            <button
              type="button"
              onClick={() => setShowCloseForm(true)}
              className="mt-2 rounded-md border border-red-500/40 bg-red-500/10 px-2.5 py-1 text-[10px] font-semibold text-red-300 transition hover:bg-red-500/20"
            >
              End incident
            </button>
          ) : (
            <div className="mt-2 space-y-2 rounded-lg border border-border/60 bg-background/50 p-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                Response outcome
              </p>
              <select
                value={closureOutcome}
                disabled={closing}
                onChange={(e) => setClosureOutcome(e.target.value)}
                className="w-full rounded-md border border-border/70 bg-background/80 px-2 py-1.5 text-[11px] text-foreground outline-none focus:border-accent"
              >
                {CLOSURE_OUTCOMES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              {closureOutcome === "other" && (
                <div>
                  <label className="mb-1 block text-[10px] text-muted">
                    Please specify
                  </label>
                  <textarea
                    value={closureRemarks}
                    disabled={closing}
                    onChange={(e) => setClosureRemarks(e.target.value)}
                    rows={3}
                    placeholder="Describe what happened and police response…"
                    className="w-full resize-none rounded-md border border-border/70 bg-background/80 px-2 py-1.5 text-[11px] text-foreground outline-none focus:border-accent"
                  />
                </div>
              )}

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
                  {closing ? "Saving…" : "Close incident"}
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

        {selectedCall && nearbyUnits.length === 0 && (
          <p className="py-4 text-center text-xs text-muted">
            No mobile units within {(dispatchMaxRadiusM / 1000).toFixed(
              dispatchMaxRadiusM % 1000 === 0 ? 0 : 1
            )}{" "}
            km of this incident.
          </p>
        )}

        {selectedCall && nearbyUnits.length > 0 && (
          <ul className="space-y-2">
            {nearbyUnits.map((unit, index) => {
              const route = routeByUnit[unit.key];
              const isHighlighted = highlightedUnitKey === unit.key;
              const isRouteActive =
                dispatchRoute?.unitKey === unit.key &&
                dispatchRoute?.callId === selectedCallId;
              const drivingDistance = route?.distanceLabel ?? unit.distanceLabel;
              const eta =
                route?.etaLabel ?? `~${unit.etaMinutesEstimate} min (est.)`;

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
