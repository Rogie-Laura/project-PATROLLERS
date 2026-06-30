"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import { formatTokenUser } from "@/lib/mobile/adminRoles";
import {
  severityBadgeClass,
  severityLabel,
} from "@/lib/admin/tokenConflicts";

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

function formatPct(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return "—";
  return `${num.toFixed(1)}%`;
}

function ConflictSpotList({ spots }) {
  if (!Array.isArray(spots) || spots.length === 0) {
    return <p className="text-[11px] text-muted">No spot breakdown available.</p>;
  }

  return (
    <ul className="space-y-1.5">
      {spots.map((spot, index) => (
        <li
          key={`${spot.latitude}-${spot.longitude}-${index}`}
          className="rounded-md border border-border/50 bg-background/40 px-2.5 py-2 text-[11px] text-muted"
        >
          <div className="font-medium text-foreground">
            Spot {index + 1}: {spot.latitude}, {spot.longitude}
          </div>
          <div className="mt-0.5">
            {spot.pings} pings · {spot.common_signal || "Unknown"} · accuracy ~
            {spot.avg_accuracy_m ?? "—"} m
          </div>
          <div className="mt-0.5">Last ping: {formatDate(spot.last_ping_at)}</div>
        </li>
      ))}
    </ul>
  );
}

export default function TokenConflictMonitor() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [lookbackDays, setLookbackDays] = useState(7);
  const [minConflictMinutes, setMinConflictMinutes] = useState(5);
  const [report, setReport] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [actionId, setActionId] = useState(null);

  const loadReport = useCallback(async (opts = {}) => {
    const silent = opts.silent === true;
    if (silent) setRefreshing(true);
    else setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({
        days: String(lookbackDays),
        min_minutes: String(minConflictMinutes),
      });
      const res = await fetch(`/api/admin/token-conflicts?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Could not load token conflict report.");
      }

      setReport(data);
    } catch (err) {
      setError(err.message ?? "Could not load token conflict report.");
    } finally {
      if (silent) setRefreshing(false);
      else setLoading(false);
    }
  }, [lookbackDays, minConflictMinutes]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  async function handleReleaseDevice(row) {
    const confirmed = window.confirm(
      `Release device binding for "${row.label || row.token}"?\n\nAnother phone will be able to scan this token again.`
    );
    if (!confirmed) return;

    setActionId(row.access_token_id);
    setNotice("");
    setError("");

    try {
      const res = await fetch(`/api/admin/access-tokens/${row.access_token_id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ release_device: true }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Could not release device binding.");
      }
      setNotice(`Released device binding for ${row.label || row.token}.`);
      await loadReport({ silent: true });
    } catch (err) {
      setError(err.message ?? "Could not release device binding.");
    } finally {
      setActionId(null);
    }
  }

  async function handleDeactivate(row) {
    const confirmed = window.confirm(
      `Deactivate token "${row.label || row.token}"?\n\nAll phones using this token will stop until you reactivate it in Access Tokens.`
    );
    if (!confirmed) return;

    setActionId(row.access_token_id);
    setNotice("");
    setError("");

    try {
      const res = await fetch(`/api/admin/access-tokens/${row.access_token_id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: false }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Could not deactivate token.");
      }
      setNotice(`Deactivated ${row.label || row.token}. Reactivate from Access Tokens when ready.`);
      await loadReport({ silent: true });
    } catch (err) {
      setError(err.message ?? "Could not deactivate token.");
    } finally {
      setActionId(null);
    }
  }

  const conflicts = report?.conflicts ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="conflict-days" className="mb-1 block text-xs text-muted">
            Lookback days
          </label>
          <select
            id="conflict-days"
            value={lookbackDays}
            onChange={(e) => setLookbackDays(Number(e.target.value))}
            className="rounded-lg border border-border/70 bg-background/80 px-2.5 py-1.5 text-sm text-foreground outline-none focus:border-accent"
          >
            {[3, 7, 14, 30].map((days) => (
              <option key={days} value={days}>
                {days} days
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="conflict-minutes" className="mb-1 block text-xs text-muted">
            Min conflict minutes
          </label>
          <select
            id="conflict-minutes"
            value={minConflictMinutes}
            onChange={(e) => setMinConflictMinutes(Number(e.target.value))}
            className="rounded-lg border border-border/70 bg-background/80 px-2.5 py-1.5 text-sm text-foreground outline-none focus:border-accent"
          >
            {[3, 5, 10, 20].map((minutes) => (
              <option key={minutes} value={minutes}>
                {minutes}+ minutes
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={() => loadReport({ silent: true })}
          disabled={loading || refreshing}
          className="rounded-lg border border-accent/30 px-3 py-1.5 text-xs font-medium text-accent transition hover:bg-accent/10 disabled:opacity-50"
        >
          {refreshing ? "Refreshing..." : "Refresh report"}
        </button>
      </div>

      {notice && (
        <p className="rounded-lg border border-accent/30 bg-accent/10 px-3 py-2 text-sm text-accent">
          {notice}
        </p>
      )}

      {error && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
          {error}
        </p>
      )}

      <div className="grid gap-2 sm:grid-cols-3">
        <div className="rounded-lg border border-border/60 bg-background/40 px-3 py-2.5">
          <p className="text-[10px] uppercase tracking-wide text-muted">Flagged tokens</p>
          <p className="mt-1 text-lg font-semibold text-foreground">
            {loading ? "…" : report?.conflict_count ?? 0}
          </p>
        </div>
        <div className="rounded-lg border border-border/60 bg-background/40 px-3 py-2.5">
          <p className="text-[10px] uppercase tracking-wide text-muted">Critical</p>
          <p className="mt-1 text-lg font-semibold text-red-400">
            {loading ? "…" : report?.critical_count ?? 0}
          </p>
        </div>
        <div className="rounded-lg border border-border/60 bg-background/40 px-3 py-2.5">
          <p className="text-[10px] uppercase tracking-wide text-muted">Last scan</p>
          <p className="mt-1 text-xs font-medium text-foreground">
            {loading ? "…" : formatDate(report?.scanned_at)}
          </p>
        </div>
      </div>

      {loading ? (
        <p className="py-8 text-center text-sm text-muted">Scanning GPS history…</p>
      ) : conflicts.length === 0 ? (
        <div className="rounded-xl border border-border/70 bg-background/30 px-4 py-8 text-center">
          <p className="text-sm text-foreground">No shared-token conflicts detected.</p>
          <p className="mt-1 text-xs text-muted">
            Tokens appear when two or more locations send GPS for the same access token within
            one minute, repeated across the lookback window.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border/70">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-border/70 bg-background/40 text-xs uppercase tracking-wide text-muted">
                <tr>
                  <th className="px-3 py-3 font-medium">Severity</th>
                  <th className="px-3 py-3 font-medium">Unit</th>
                  <th className="px-3 py-3 font-medium">Token</th>
                  <th className="px-3 py-3 font-medium">Signals</th>
                  <th className="px-3 py-3 font-medium">Status</th>
                  <th className="px-3 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {conflicts.map((row) => {
                  const expanded = expandedId === row.access_token_id;
                  const busy = actionId === row.access_token_id;
                  const mobileUser = {
                    mobile_plate: row.mobile_plate,
                    radio_call_sign: row.radio_call_sign,
                    unit: row.unit,
                    office: row.office,
                  };

                  return (
                    <Fragment key={row.access_token_id}>
                      <tr className="text-foreground/90">
                        <td className="px-3 py-3 align-top">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ${severityBadgeClass(row.severity)}`}
                          >
                            {severityLabel(row.severity)}
                          </span>
                          <div className="mt-2 text-[11px] text-muted">
                            {row.conflict_minutes} conflict min
                            <br />
                            {formatPct(row.jump_pct)} jumps &gt; 5 km
                          </div>
                        </td>
                        <td className="px-3 py-3 align-top">
                          <div className="font-medium text-foreground">
                            {row.label || "—"}
                          </div>
                          <div className="mt-1 text-[11px] text-muted">
                            {formatTokenUser(mobileUser)}
                          </div>
                          <div className="mt-1 text-[11px] text-muted">
                            Last seen: {formatDate(row.last_seen_at)}
                          </div>
                        </td>
                        <td className="px-3 py-3 align-top">
                          <code className="break-all font-mono text-[10px]">
                            {row.token}
                          </code>
                          <div className="mt-1 text-[11px] text-muted">
                            {row.distinct_spot_clusters} spots · max{" "}
                            {row.max_pings_same_minute}/min
                          </div>
                        </td>
                        <td className="px-3 py-3 align-top text-[11px] text-muted">
                          {row.is_device_bound ? (
                            <span className="text-accent">Device bound</span>
                          ) : (
                            <span className="text-amber-400">No device lock</span>
                          )}
                          <br />
                          {row.live_tracking_active ? (
                            <span className="text-accent">Live tracking ON</span>
                          ) : (
                            <span>Live tracking OFF</span>
                          )}
                        </td>
                        <td className="px-3 py-3 align-top">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${
                              row.is_active
                                ? "bg-accent/15 text-accent"
                                : "bg-red-500/10 text-red-400"
                            }`}
                          >
                            {row.is_active ? "Active" : "Deactivated"}
                          </span>
                        </td>
                        <td className="px-3 py-3 align-top">
                          <div className="flex flex-col gap-1.5">
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedId(expanded ? null : row.access_token_id)
                              }
                              className="rounded-md border border-border/70 px-2.5 py-1 text-[11px] font-medium text-foreground transition hover:bg-background/80"
                            >
                              {expanded ? "Hide spots" : "View spots"}
                            </button>
                            {row.is_device_bound && (
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => handleReleaseDevice(row)}
                                className="rounded-md border border-amber-500/30 px-2.5 py-1 text-[11px] font-medium text-amber-400 transition hover:bg-amber-500/10 disabled:opacity-50"
                              >
                                Release device
                              </button>
                            )}
                            {row.is_active && (
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => handleDeactivate(row)}
                                className="rounded-md border border-red-500/30 px-2.5 py-1 text-[11px] font-medium text-red-400 transition hover:bg-red-500/10 disabled:opacity-50"
                              >
                                Deactivate
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                      {expanded && (
                        <tr>
                          <td colSpan={6} className="bg-background/20 px-3 py-3">
                            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted">
                              Top GPS clusters (likely separate phones)
                            </p>
                            <ConflictSpotList spots={row.spots} />
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="text-[11px] leading-relaxed text-muted">
        A conflict means the same access token sent GPS from two or more places within the
        same minute, repeatedly. This usually indicates two phones sharing one QR token.
        Install APK 1.6.44+ on the duty phone and deactivate/reactivate the token to force a
        clean bind.
      </p>
    </div>
  );
}
