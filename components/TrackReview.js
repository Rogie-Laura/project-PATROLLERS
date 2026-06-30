"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import PatrolDetailPanel from "@/components/PatrolDetailPanel";
import { trackReviewHref } from "@/lib/trackReview";

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

const UNIT_DETAIL_SELECT =
  "id, access_token_id, user_id, latitude, longitude, created_at, mobile_plate, radio_call_sign, mobile_phone, office, unit, patrol_name, patrol_status, accuracy, personnel_on_board, duty_shifts, visibility_points, battery_level, signal_label, signal_level";

function todayIsoDate() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60 * 1000).toISOString().slice(0, 10);
}

function nowIsoTime() {
  const now = new Date();
  return now.toTimeString().slice(0, 5);
}

function oneHourAgoIsoTime() {
  const dt = new Date(Date.now() - 60 * 60 * 1000);
  return dt.toTimeString().slice(0, 5);
}

function parseLocalDateTime(dateStr, timeStr) {
  if (!dateStr) return null;
  const dt = new Date(`${dateStr}T${timeStr || "00:00"}:00`);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function buildTimeBounds(
  rangeMode,
  rangeId,
  customStartDate,
  customStartTime,
  customEndDate,
  customEndTime
) {
  if (rangeMode === "custom") {
    const start = parseLocalDateTime(customStartDate, customStartTime);
    const end = parseLocalDateTime(
      customEndDate || customStartDate,
      customEndTime || "23:59"
    );

    if (!start || !end || end < start) {
      return null;
    }

    return { since: start.toISOString(), until: end.toISOString() };
  }

  const range = TIME_RANGES.find((item) => item.id === rangeId) ?? TIME_RANGES[0];
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

async function fetchUnitDetail(supabase, unitKey) {
  if (!unitKey) return null;

  const { data: loc, error: locError } = await supabase
    .from("location_updates")
    .select(UNIT_DETAIL_SELECT)
    .or(`access_token_id.eq.${unitKey},user_id.eq.${unitKey}`)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (locError || !loc) return null;

  if (!loc.access_token_id) {
    return loc;
  }

  const { data: profile } = await supabase
    .from("mobile_device_profiles")
    .select(
      "last_seen_at, personnel_on_board, duty_shifts, visibility_points, patrol_status"
    )
    .eq("access_token_id", loc.access_token_id)
    .maybeSingle();

  return {
    ...loc,
    last_seen_at: profile?.last_seen_at ?? loc.last_seen_at,
    personnel_on_board: profile?.personnel_on_board ?? loc.personnel_on_board,
    duty_shifts: profile?.duty_shifts ?? loc.duty_shifts,
    visibility_points: profile?.visibility_points ?? loc.visibility_points,
    patrol_status: profile?.patrol_status ?? loc.patrol_status,
  };
}

export default function TrackReview({
  basemapId,
  showPatrolStatus = false,
  initialUnitKey = "",
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [devices, setDevices] = useState([]);
  const [selectedKey, setSelectedKey] = useState(initialUnitKey);
  const [rangeMode, setRangeMode] = useState("preset");
  const [rangeId, setRangeId] = useState("1h");
  const [customStartDate, setCustomStartDate] = useState(todayIsoDate);
  const [customStartTime, setCustomStartTime] = useState(oneHourAgoIsoTime);
  const [customEndDate, setCustomEndDate] = useState(todayIsoDate);
  const [customEndTime, setCustomEndTime] = useState(nowIsoTime);
  const [showInfoPanel, setShowInfoPanel] = useState(true);
  const [points, setPoints] = useState([]);
  const [unitDetail, setUnitDetail] = useState(null);
  const [loadingDevices, setLoadingDevices] = useState(true);
  const [loadingTrack, setLoadingTrack] = useState(false);
  const [loadingUnitDetail, setLoadingUnitDetail] = useState(false);
  const mapAreaRef = useRef(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (initialUnitKey) {
      setSelectedKey(initialUnitKey);
    }
  }, [initialUnitKey]);

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

      setSelectedKey((current) => {
        if (initialUnitKey) return initialUnitKey;
        if (current && (list.some((device) => device.key === current) || current)) {
          return current;
        }
        return list[0]?.key ?? "";
      });
      setLoadingDevices(false);
    }

    loadDevices();
  }, [supabase, initialUnitKey]);

  useEffect(() => {
    if (!selectedKey) {
      setUnitDetail(null);
      return undefined;
    }

    let active = true;
    setLoadingUnitDetail(true);

    fetchUnitDetail(supabase, selectedKey)
      .then((detail) => {
        if (active) setUnitDetail(detail);
      })
      .finally(() => {
        if (active) setLoadingUnitDetail(false);
      });

    return () => {
      active = false;
    };
  }, [supabase, selectedKey]);

  const syncUnitInUrl = useCallback(
    (unitKey) => {
      router.replace(trackReviewHref(unitKey), { scroll: false });
    },
    [router]
  );

  const handleSelectUnit = useCallback(
    (unitKey) => {
      setSelectedKey(unitKey);
      if (unitKey) syncUnitInUrl(unitKey);
    },
    [syncUnitInUrl]
  );

  const loadTrack = useCallback(async () => {
    if (!selectedKey) return;

    const bounds = buildTimeBounds(
      rangeMode,
      rangeId,
      customStartDate,
      customStartTime,
      customEndDate,
      customEndTime
    );
    if (!bounds) {
      setError("Choose a valid custom date and time range.");
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

    if (devices.find((device) => device.key === selectedKey) || selectedKey) {
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
    customStartTime,
    customEndDate,
    customEndTime,
    devices,
  ]);

  useEffect(() => {
    if (selectedKey) loadTrack();
  }, [
    selectedKey,
    rangeMode,
    rangeId,
    customStartDate,
    customStartTime,
    customEndDate,
    customEndTime,
    loadTrack,
  ]);

  return (
    <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
      <aside className="flex shrink-0 flex-col gap-4 overflow-y-auto overscroll-contain border-b border-border/60 bg-card/80 p-4 lg:max-h-full lg:w-80 lg:border-b-0 lg:border-r">
        <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-border/60 bg-background/40 px-3 py-2">
          <span className="text-xs font-medium text-foreground">Unit information panel</span>
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
            onChange={(e) => handleSelectUnit(e.target.value)}
            disabled={loadingDevices}
            className="w-full rounded-lg border border-border/80 bg-background/80 px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
          >
            {loadingDevices && <option>Loading...</option>}
            {!loadingDevices && devices.length === 0 && !selectedKey && (
              <option value="">No units found</option>
            )}
            {selectedKey &&
              !devices.some((device) => device.key === selectedKey) && (
                <option value={selectedKey}>Selected unit</option>
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
          <div className="space-y-3">
            <div>
              <p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-muted">
                From
              </p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted">Date</label>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="w-full rounded-lg border border-border/80 bg-background/80 px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted">Time</label>
                  <input
                    type="time"
                    value={customStartTime}
                    onChange={(e) => setCustomStartTime(e.target.value)}
                    className="w-full rounded-lg border border-border/80 bg-background/80 px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
                  />
                </div>
              </div>
            </div>
            <div>
              <p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-muted">
                To
              </p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted">Date</label>
                  <input
                    type="date"
                    value={customEndDate}
                    min={customStartDate || undefined}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="w-full rounded-lg border border-border/80 bg-background/80 px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted">Time</label>
                  <input
                    type="time"
                    value={customEndTime}
                    onChange={(e) => setCustomEndTime(e.target.value)}
                    className="w-full rounded-lg border border-border/80 bg-background/80 px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
                  />
                </div>
              </div>
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

      <section className="relative min-h-0 flex-1 overflow-hidden">
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
          </div>
        )}

        {showInfoPanel && (
          <div className="pointer-events-none absolute inset-y-0 right-0 z-[500] w-[min(100%,340px)]">
            <div className="pointer-events-auto h-full w-full">
              {loadingUnitDetail ? (
                <aside className="flex h-full w-full flex-col border-l border-border/60 bg-card">
                  <div className="flex flex-1 items-center justify-center p-4 text-sm text-muted">
                    Loading unit information...
                  </div>
                </aside>
              ) : unitDetail ? (
                <PatrolDetailPanel
                  location={unitDetail}
                  showPatrolStatus={showPatrolStatus}
                  onClose={() => setShowInfoPanel(false)}
                />
              ) : (
                <aside className="flex h-full w-full flex-col border-l border-border/60 bg-card">
                  <div className="flex flex-1 items-center justify-center p-4 text-center text-sm text-muted">
                    No unit profile found for this selection.
                  </div>
                </aside>
              )}
            </div>
          </div>
        )}

        {!showInfoPanel && (
          <button
            type="button"
            onClick={() => setShowInfoPanel(true)}
            className="absolute right-3 top-3 z-[500] rounded-lg border border-border/70 bg-card/95 px-3 py-2 text-xs font-medium text-foreground shadow-lg backdrop-blur-sm hover:border-accent"
          >
            Show information panel
          </button>
        )}
      </section>
    </div>
  );
}
