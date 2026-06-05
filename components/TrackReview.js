"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase/client";
import MapLegendOverlay from "@/components/MapLegendOverlay";
import MapStatisticsOverlay from "@/components/MapStatisticsOverlay";

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
  showPatrolStatus = true,
  showLegend = true,
  showStatistics = false,
}) {
  const supabase = useMemo(() => createClient(), []);

  const [devices, setDevices] = useState([]);
  const [selectedKey, setSelectedKey] = useState("");
  const [rangeId, setRangeId] = useState("24h");
  const [points, setPoints] = useState([]);
  const [loadingDevices, setLoadingDevices] = useState(true);
  const [loadingTrack, setLoadingTrack] = useState(false);
  const [error, setError] = useState("");

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

    setLoadingTrack(true);
    setError("");

    const range = TIME_RANGES.find((r) => r.id === rangeId) ?? TIME_RANGES[2];
    const since = new Date(Date.now() - range.hours * 60 * 60 * 1000).toISOString();

    const column = selectedKey.startsWith("unknown") ? null : selectedKey;

    let query = supabase
      .from("location_updates")
      .select("id, latitude, longitude, created_at, patrol_status, access_token_id, user_id")
      .gte("created_at", since)
      .order("created_at", { ascending: true })
      .limit(5000);

    // Match either access_token_id or user_id depending on the device key.
    const device = devices.find((d) => d.key === selectedKey);
    if (device) {
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
  }, [supabase, selectedKey, rangeId, devices]);

  useEffect(() => {
    if (selectedKey) loadTrack();
  }, [selectedKey, rangeId, loadTrack]);

  return (
    <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
      <aside className="flex shrink-0 flex-col gap-4 border-b border-border/60 bg-card/80 p-4 lg:w-80 lg:border-b-0 lg:border-r">
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
                onClick={() => setRangeId(range.id)}
                className={`rounded-lg border px-2 py-2 text-xs font-medium transition ${
                  rangeId === range.id
                    ? "border-accent bg-accent/15 text-accent"
                    : "border-border/70 text-muted hover:text-foreground"
                }`}
              >
                {range.label}
              </button>
            ))}
          </div>
        </div>

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

      <section className="relative min-h-[400px] flex-1">
        {points.length === 0 && !loadingTrack ? (
          <div className="flex h-full items-center justify-center bg-card text-sm text-muted">
            No location history for this unit in the selected time range.
          </div>
        ) : (
          <>
            <TrackReviewMap
              points={points}
              basemapId={basemapId}
              showPatrolStatus={showPatrolStatus}
            />
            {(showLegend || showStatistics) && (
              <div className="pointer-events-none absolute bottom-4 left-4 z-[500] flex max-w-[min(100%,260px)] flex-col gap-2">
                {showStatistics && (
                  <MapStatisticsOverlay locations={points} nowMs={Date.now()} />
                )}
                {showLegend && <MapLegendOverlay />}
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
