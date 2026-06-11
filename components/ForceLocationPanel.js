"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  LOCATION_REQUEST_MODES,
  LOCATION_REQUEST_STATUS,
} from "@/lib/mobile/locationRequests";

function StatusPill({ status }) {
  const styles = {
    pending: "bg-amber-500/15 text-amber-300",
    success: "bg-emerald-500/15 text-emerald-300",
    failed: "bg-red-500/15 text-red-300",
  };

  return (
    <span
      className={`rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${styles[status] ?? styles.pending}`}
    >
      {status}
    </span>
  );
}

function ModeOption({ active, title, description, tone, onClick }) {
  const tones = {
    silent: active
      ? "border-sky-400/70 bg-sky-500/15 text-sky-100"
      : "border-border/60 bg-background/40 text-muted hover:border-sky-500/40 hover:text-foreground",
    alarm: active
      ? "border-orange-400/70 bg-orange-500/15 text-orange-100"
      : "border-border/60 bg-background/40 text-muted hover:border-orange-500/40 hover:text-foreground",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border px-3 py-2.5 text-left transition ${tones[tone]}`}
    >
      <p className="text-sm font-semibold">{title}</p>
      <p className="mt-1 text-[11px] leading-snug opacity-90">{description}</p>
    </button>
  );
}

export default function ForceLocationPanel({
  locations = [],
  selectedLocation = null,
  onClose,
}) {
  const supabase = useMemo(() => createClient(), []);
  const [batchId, setBatchId] = useState(null);
  const [batch, setBatch] = useState(null);
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState("all");
  const [requestMode, setRequestMode] = useState(LOCATION_REQUEST_MODES.silent);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadBatch = useCallback(async (id) => {
    const res = await fetch(`/api/monitor/location-requests/${id}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Could not load batch.");
    setBatch(data.batch);
    setItems(data.items ?? []);
  }, []);

  useEffect(() => {
    if (!batchId) return undefined;

    loadBatch(batchId).catch((err) => setError(err.message));

    const pollId = setInterval(() => {
      loadBatch(batchId).catch(() => {});
    }, 5000);

    const channel = supabase
      .channel(`location_request_batch_${batchId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "location_request_items",
          filter: `batch_id=eq.${batchId}`,
        },
        () => {
          loadBatch(batchId).catch(() => {});
        }
      )
      .subscribe();

    return () => {
      clearInterval(pollId);
      supabase.removeChannel(channel);
    };
  }, [batchId, loadBatch, supabase]);

  const targetIds = useMemo(() => {
    if (selectedLocation?.access_token_id) {
      return [selectedLocation.access_token_id];
    }
    return locations.map((loc) => loc.access_token_id).filter(Boolean);
  }, [locations, selectedLocation]);

  const unitCount = targetIds.length;

  const filteredItems = useMemo(() => {
    if (filter === "all") return items;
    return items.filter((item) => item.status === filter);
  }, [filter, items]);

  async function handleRequest() {
    setError("");
    setLoading(true);

    const isAlarm = requestMode === LOCATION_REQUEST_MODES.alarm;

    try {
      const res = await fetch("/api/monitor/location-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          access_token_ids: targetIds,
          request_mode: requestMode,
          label: selectedLocation
            ? `${isAlarm ? "Alarm" : "Silent"} — single unit`
            : `${isAlarm ? "Alarm" : "Silent"} — fleet`,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Request failed.");

      setBatchId(data.batch?.id ?? null);
      setBatch(data.batch ?? null);
      setItems([]);
      setFilter("all");
    } catch (err) {
      setError(err.message ?? "Could not request locations.");
    } finally {
      setLoading(false);
    }
  }

  const progress =
    batch && batch.totalCount > 0
      ? Math.round(
          ((batch.successCount + batch.failedCount) / batch.totalCount) * 100
        )
      : 0;

  const isAlarmMode = requestMode === LOCATION_REQUEST_MODES.alarm;

  return (
    <div className="pointer-events-auto absolute bottom-4 left-1/2 z-[500] w-[min(100%,440px)] -translate-x-1/2 rounded-lg border border-border/60 bg-card/95 shadow-xl backdrop-blur-sm">
      <div className="flex items-start justify-between gap-2 border-b border-border/60 px-3 py-2.5">
        <div className="min-w-0">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted">
            Force location
          </p>
          <h2 className="text-sm font-semibold text-foreground">
            {selectedLocation
              ? "Request fresh GPS from selected unit"
              : `Request fresh GPS from fleet`}
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-md p-1 text-muted transition hover:bg-background/80 hover:text-foreground"
          aria-label="Close force location panel"
        >
          ✕
        </button>
      </div>

      <div className="space-y-3 px-3 py-3">
        {!batchId && (
          <>
            <div className="rounded-lg border border-border/50 bg-background/50 px-3 py-2.5">
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted">
                Units to reach
              </p>
              <p className="mt-0.5 text-lg font-semibold text-foreground">
                {unitCount} <span className="text-sm font-medium text-muted">unit(s)</span>
              </p>
              <p className="mt-1 text-[11px] leading-snug text-muted">
                {selectedLocation
                  ? "Only the selected patrol unit will receive this request."
                  : "All active units on the map will receive this request."}
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-[11px] font-medium text-foreground">Delivery mode</p>
              <div className="grid gap-2 sm:grid-cols-2">
                <ModeOption
                  active={!isAlarmMode}
                  tone="silent"
                  title="Silent"
                  description="No alarm on the phone. Units with tracking on send GPS automatically."
                  onClick={() => setRequestMode(LOCATION_REQUEST_MODES.silent)}
                />
                <ModeOption
                  active={isAlarmMode}
                  tone="alarm"
                  title="Alarm"
                  description="Orange edge alert, distinct tone, and a Send Location button on the phone."
                  onClick={() => setRequestMode(LOCATION_REQUEST_MODES.alarm)}
                />
              </div>
            </div>

            <button
              type="button"
              onClick={handleRequest}
              disabled={loading || unitCount === 0}
              className={`w-full rounded-lg px-3 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 ${
                isAlarmMode ? "bg-orange-600 hover:bg-orange-500" : "bg-sky-600 hover:bg-sky-500"
              }`}
            >
              {loading
                ? "Sending requests..."
                : isAlarmMode
                  ? `Send alarm to ${unitCount} unit(s)`
                  : `Send silent request to ${unitCount} unit(s)`}
            </button>
          </>
        )}

        {error && (
          <p className="rounded-md border border-red-500/30 bg-red-500/10 px-2.5 py-2 text-xs text-red-300">
            {error}
          </p>
        )}

        {batch && (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="font-medium text-foreground">
                {batch.requestMode === LOCATION_REQUEST_MODES.alarm ? "Alarm" : "Silent"} batch
              </span>
              <span className="text-muted">
                {batch.successCount + batch.failedCount} / {batch.totalCount} ({progress}%)
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-background/80">
              <div
                className={`h-full rounded-full transition-all ${
                  batch.requestMode === LOCATION_REQUEST_MODES.alarm
                    ? "bg-orange-500"
                    : "bg-sky-500"
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="flex flex-wrap gap-2 text-[11px]">
              {[
                { key: "all", label: `All (${items.length})` },
                {
                  key: LOCATION_REQUEST_STATUS.success,
                  label: `Successful (${batch.successCount})`,
                },
                {
                  key: LOCATION_REQUEST_STATUS.failed,
                  label: `Failed (${batch.failedCount})`,
                },
                {
                  key: LOCATION_REQUEST_STATUS.pending,
                  label: `Pending (${batch.pendingCount})`,
                },
              ].map((entry) => (
                <button
                  key={entry.key}
                  type="button"
                  onClick={() => setFilter(entry.key)}
                  className={`rounded-md px-2 py-1 transition ${
                    filter === entry.key
                      ? "bg-accent/20 text-foreground"
                      : "text-muted hover:bg-background/70 hover:text-foreground"
                  }`}
                >
                  {entry.label}
                </button>
              ))}
            </div>

            <ul className="max-h-40 space-y-1 overflow-y-auto rounded-md border border-border/50 bg-background/40 p-2">
              {filteredItems.length === 0 ? (
                <li className="text-xs text-muted">No units in this filter.</li>
              ) : (
                filteredItems.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-start justify-between gap-2 rounded px-1 py-1 text-xs"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-foreground">
                        {item.unitName}
                      </p>
                      {item.failureReason && (
                        <p className="text-[10px] text-red-300">
                          {item.failureReason}
                        </p>
                      )}
                    </div>
                    <StatusPill status={item.status} />
                  </li>
                ))
              )}
            </ul>

            {batch.pendingCount === 0 && (
              <button
                type="button"
                onClick={() => {
                  setBatchId(null);
                  setBatch(null);
                  setItems([]);
                  setFilter("all");
                }}
                className="w-full rounded-lg border border-border/70 px-3 py-2 text-sm text-foreground transition hover:bg-background/70"
              >
                Done
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
