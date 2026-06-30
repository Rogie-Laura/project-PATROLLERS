"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase/client";
import MapViewOverlays from "@/components/MapViewOverlays";

const TrackReviewMap = dynamic(() => import("@/components/TrackReviewMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center bg-card text-muted">
      Loading map...
    </div>
  ),
});

const TIME_RANGES = [
  { id: "1h", label: "Last 1 hour", hours: 1 },
  { id: "6h", label: "Last 6 hours", hours: 6 },
  { id: "24h", label: "Last 24 hours", hours: 24 },
  { id: "7d", label: "Last 7 days", hours: 24 * 7 },
];

function todayIsoDate() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60 * 1000).toISOString().slice(0, 10);
}

function buildTimeBounds(rangeMode, rangeId, customStartDate, customEndDate) {
  if (rangeMode === "custom") {
    if (!customStartDate) return null;

    const start = new Date(`${customStartDate}T00:00:00`);
    const endDate = customEndDate || customStartDate;
    const end = new Date(`${endDate}T23:59:59.999`);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
      return null;
    }

    return { since: start.toISOString(), until: end.toISOString() };
  }

  const range = TIME_RANGES.find((item) => item.id === rangeId) ?? TIME_RANGES[2];
  return {
    since: new Date(Date.now() - range.hours * 60 * 60 * 1000).toISOString(),
    until: null,
  };
}

function deviceKey(row) {
  return row.access_token_id || row.user_id || "unknown";
}

function deviceLabel(row) {
  return (
    row.mobile_plate ||
    row.radio_call_sign ||
    row.patrol_name ||
    row.unit ||
    "Mobile Unit"
  );
}

export default function TrackReview({
  basemapId,
  showPatrolStatus = false,
  mapViewLayers,
}) {
  const supabase = useMemo(() => createClient(), []);

  const [devices, setDevices] = useState([]);
  const [selectedKey, setSelectedKey] = useState("");
  const [rangeMode, setRangeMode] = useState("preset");
  const [rangeId, setRangeId] = useState("24h");
  const [customStartDate, setCustomStartDate] = useState(todayIsoDate);
  const [customEndDate, setCustomEndDate] = useState(todayIsoDate);
  const [showInfoPanel, setShowInfoPanel] = useState(true);
  const [points, setPoints] = useState([]);
  const [loadingDevices, setLoadingDevices] = useState(true);
  const [loadingTrack, setLoadingTrack] = useState(false);
  const mapAreaRef = useRef(null);
  const [mapAreaSize, setMapAreaSize] = useState({ width: 0, height: 0 });
  const [error, setError] = useState("");

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
  }, [points.length, loadingTrack]);

  useEffect(() => {
    async function loadDevices() {
      const { data, error: fetchError } = await supabase
        .from("location_updates")
        .select(
          "access_token_id, user_id, mobile_plate, radio_call_sign, patrol_name, unit, created_at"
        )
        .order("created_at", { ascending: false })
        .limit(2000);

      if (fetchError) {
        setError(fetchError.message);
        setLoadingDevices(false);
        return;
      }

      const seen = new Map();
      for (const row of data || []) {
        const key = deviceKey(row);
        if (!seen.has(key)) {
          seen.set(key, { key, label: deviceLabel(row) });
        }
      }

      const list = Array.from(seen.values());
      setDevices(list);
      if (list.length > 0) setSelectedKey(list[0].key);
      setLoadingDevices(false);
    }

    loadDevices();
  }, [supabase]);

  const loadTrack = useCallback(async () => {
    if (!selectedKey) return;

    const bounds = buildTimeBounds(rangeMode, rangeId, customStartDate, customEndDate);
    if (!bounds) {
      setError("Choose a valid custom date range.");
      setPoints([]);
      return;
    }

    setLoadingTrack(true);
    setError("");

    let query = supabase
      .from("location_updates")
      .select("id, latitude, longitude, created_at, patrol_status, access_token_id, user_id")
      .gte("created_at", bounds.since)
      .order("created_at", { ascending: true })
      .limit(5000);

    if (bounds.until) {
      query = query.lte("created_at", bounds.until);
    }

    if (devices.find((device) => device.key === selectedKey)) {
      query = query.or(
        `access_token_id.eq.${selectedKey},user_id.eq.${selectedKey}`
      );
    }

    const { data, error: fetchError } = await query;

    if (fetchError) {
      setError(fetchError.message);
      setPoints([]);
    } else {
      setPoints(data || []);
    }

    setLoadingTrack(false);
  }, [
    supabase,
    selectedKey,
    rangeMode,
    rangeId,
    customStartDate,
    customEndDate,
    devices,
  ]);

  useEffect(() => {
    if (selectedKey) loadTrack();
  }, [selectedKey, rangeMode, rangeId, customStartDate, customEndDate, loadTrack]);

  return (
    <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
      {showInfoPanel && (
        <aside className="flex shrink-0 flex-col gap-4 overflow-y-auto overscroll-contain border-b border-border/60 bg-card/80 p-4 lg:max-h-full lg:w-80 lg:border-b-0 lg:border-r">
          <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-border/60 bg-background/40 px-3 py-2">
            <span className="text-xs font-medium text-foreground">Information panel</span>
            <input
              type="checkbox"
              checked={showInfoPanel}
              onChange={(e) => setShowInfoPanel(e.target.checked)}
              className="h-4 w-4 accent-accent"
            />
          </label>

          <div>
            <label className="mb-1 block text-xs font-medium text-muted">
              Mobile Unit
            </label>
            <select
              value={selectedKey}
              onChange={(e) => setSelectedKey(e.target.value)}
              disabled={loadingDevices}
              className="w-full rounded-lg border border-border/80 bg-background/80 px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
            >
              {loadingDevices && <option>Loading...</option>}
              {!loadingDevices && devices.length === 0 && (
                <option value="">No units found</option>
              )}
              {devices.map((device) => (
                <option key={device.key} value={device.key}>
                  {device.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-muted">
              Time Range
            </label>
            <div className="grid grid-cols-2 gap-2">
              {TIME_RANGES.map((range) => (
                <button
                  key={range.id}
                  type="button"
                  onClick={() => {
                    setRangeMode("preset");
                    setRangeId(range.id);
                  }}
                  className={`rounded-lg border px-2 py-2 text-xs font-medium transition ${
                    rangeMode === "preset" && rangeId === range.id
                      ? "border-accent bg-accent/15 text-accent"
                      : "border-border/70 text-muted hover:text-foreground"
                  }`}
                >
                  {range.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setRangeMode("custom")}
                className={`col-span-2 rounded-lg border px-2 py-2 text-xs font-medium transition ${
                  rangeMode === "custom"
                    ? "border-accent bg-accent/15 text-accent"
                    : "border-border/70 text-muted hover:text-foreground"
                }`}
              >
                Custom date
              </button>
            </div>
          </div>

          {rangeMode === "custom" && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted">
                  From date
                </label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="w-full rounded-lg border border-border/80 bg-background/80 px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted">
                  To date
                </label>
                <input
                  type="date"
                  value={customEndDate}
                  min={customStartDate || undefined}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="w-full rounded-lg border border-border/80 bg-background/80 px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
                />
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={loadTrack}
            disabled={loadingTrack || !selectedKey}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-background transition hover:bg-accent-dark disabled:opacity-50"
          >
            {loadingTrack ? "Loading track..." : "Refresh Track"}
          </button>

          <div className="rounded-lg border border-border/60 bg-background/40 p-3 text-xs text-muted">
            <div className="flex items-center justify-between">
              <span>Points</span>
              <span className="font-semibold text-foreground">{points.length}</span>
            </div>
            {points.length > 0 && (
              <>
                <div className="mt-2 flex items-center justify-between">
                  <span>Start</span>
                  <span className="text-foreground">
                    {new Date(points[0].created_at).toLocaleString()}
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between">
                  <span>Latest</span>
                  <span className="text-foreground">
                    {new Date(points[points.length - 1].created_at).toLocaleString()}
                  </span>
                </div>
              </>
            )}
          </div>

          {error && (
            <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
              {error}
            </p>
          )}
        </aside>
      )}

      <section className="relative min-h-0 flex-1 overflow-hidden">
        {!showInfoPanel && (
          <button
            type="button"
            onClick={() => setShowInfoPanel(true)}
            className="absolute left-3 top-3 z-[500] rounded-lg border border-border/70 bg-card/95 px-3 py-2 text-xs font-medium text-foreground shadow-lg backdrop-blur-sm hover:border-accent"
          >
            Show information panel
          </button>
        )}
        {points.length === 0 && !loadingTrack ? (
          <div className="flex h-full items-center justify-center bg-card text-sm text-muted">
            No location history for this unit in the selected time range.
          </div>
        ) : (
          <div ref={mapAreaRef} className="absolute inset-0 overflow-hidden">
            <TrackReviewMap
              points={points}
              basemapId={basemapId}
              showPatrolStatus={showPatrolStatus}
            />
            <MapViewOverlays
              layers={mapViewLayers ?? {}}
              locations={points}
              mapAreaSize={mapAreaSize}
            />
          </div>
        )}
      </section>
    </div>
  );
}
