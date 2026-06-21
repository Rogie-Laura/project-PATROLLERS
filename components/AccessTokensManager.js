"use client";

import { useCallback, useEffect, useState } from "react";
import { formatTokenUser } from "@/lib/mobile/adminRoles";
import TokenQrCode from "@/components/TokenQrCode";

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

function CopyButton({ value }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="rounded-md border border-border/70 px-2 py-1 text-[10px] font-medium text-muted transition hover:border-accent/40 hover:text-accent sm:text-[11px]"
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function TokenQrModal({ token, label, onClose }) {
  if (!token) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-sm rounded-xl border border-border/70 bg-card p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="token-qr-title"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 id="token-qr-title" className="text-sm font-semibold text-foreground">
              Scan on mobile
            </h3>
            {label && <p className="mt-1 text-xs text-muted">{label}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-muted transition hover:bg-background/80 hover:text-foreground"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className="mt-4 flex justify-center">
          <TokenQrCode value={token} size={200} />
        </div>
        <p className="mt-4 text-center text-xs text-muted">
          Open PATROLLERS on the phone and tap Scan QR Code.
        </p>
        <div className="mt-3 flex items-start justify-center gap-2">
          <code className="break-all font-mono text-[11px] text-foreground">{token}</code>
          <CopyButton value={token} />
        </div>
      </div>
    </div>
  );
}

function QrSheetOverlay({ rows, onClose }) {
  if (!rows || rows.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-auto bg-black/60 p-4 print:static print:bg-white print:p-0">
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #qr-print-sheet, #qr-print-sheet * { visibility: visible !important; }
          #qr-print-sheet { position: absolute; left: 0; top: 0; width: 100%; }
          .qr-no-print { display: none !important; }
        }
      `}</style>

      <div className="mx-auto max-w-5xl rounded-xl bg-white p-6 shadow-xl print:max-w-none print:rounded-none print:p-0 print:shadow-none">
        <div className="qr-no-print mb-4 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-gray-900">
              QR Sheet — {rows.length} token{rows.length === 1 ? "" : "s"}
            </h3>
            <p className="mt-0.5 text-xs text-gray-500">
              Print and hand to field units. Each phone scans one QR (1 token = 1 phone).
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-gray-700"
            >
              Print
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
            >
              Close
            </button>
          </div>
        </div>

        <div
          id="qr-print-sheet"
          className="grid grid-cols-2 gap-4 sm:grid-cols-3 print:grid-cols-3 print:gap-3"
        >
          {rows.map((row) => (
            <div
              key={row.id || row.token}
              className="flex flex-col items-center gap-2 rounded-lg border border-gray-300 p-3 text-center"
              style={{ breakInside: "avoid" }}
            >
              <div className="text-sm font-semibold text-gray-900">
                {row.label || "Mobile Patrol"}
              </div>
              {row.station && (
                <div className="text-xs font-medium text-gray-500">{row.station}</div>
              )}
              <div className="rounded-md border border-gray-200 bg-white p-2">
                <TokenQrCode value={row.token} size={150} />
              </div>
              <code className="break-all text-[10px] text-gray-600">{row.token}</code>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function AccessTokensManager() {
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [label, setLabel] = useState("");
  const [station, setStation] = useState("");
  const [count, setCount] = useState(1);
  const [creating, setCreating] = useState(false);
  const [createdTokens, setCreatedTokens] = useState([]);
  const [updatingId, setUpdatingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [qrView, setQrView] = useState(null);
  const [stationFilter, setStationFilter] = useState("");
  const [qrSheetRows, setQrSheetRows] = useState(null);

  const stations = Array.from(
    new Set(tokens.map((row) => (row.station || "").trim()).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b));

  const filteredTokens = stationFilter
    ? stationFilter === "__none__"
      ? tokens.filter((row) => !(row.station || "").trim())
      : tokens.filter((row) => (row.station || "").trim() === stationFilter)
    : tokens;

  const allSelected =
    filteredTokens.length > 0 &&
    filteredTokens.every((row) => selectedIds.has(row.id));
  const someSelected =
    filteredTokens.some((row) => selectedIds.has(row.id)) && !allSelected;
  const selectedCount = selectedIds.size;

  const loadTokens = useCallback(async () => {
    setError("");
    const res = await fetch("/api/admin/access-tokens");
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Could not load access tokens.");
    }

    setTokens(data.tokens ?? []);
    setSelectedIds((prev) => {
      const validIds = new Set((data.tokens ?? []).map((row) => row.id));
      const next = new Set();
      for (const id of prev) {
        if (validIds.has(id)) next.add(id);
      }
      return next;
    });
  }, []);

  useEffect(() => {
    loadTokens()
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [loadTokens]);

  async function handleCreate(e) {
    e.preventDefault();
    setCreating(true);
    setError("");
    setCreatedTokens([]);

    const safeCount = Math.min(100, Math.max(1, Math.floor(Number(count) || 1)));

    try {
      const res = await fetch("/api/admin/access-tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: label.trim(),
          station: station.trim(),
          count: safeCount,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Could not create access token.");
      }

      const created = Array.isArray(data.tokens)
        ? data.tokens
        : data.token
          ? [data.token]
          : [];
      setCreatedTokens(created);
      setLabel("");
      setCount(1);
      await loadTokens();
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  }

  function toggleSelected(id, checked) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function toggleSelectAll(checked) {
    if (!checked) {
      setSelectedIds(new Set());
      return;
    }
    setSelectedIds(new Set(filteredTokens.map((row) => row.id)));
  }

  async function deleteTokenRows(rows) {
    if (rows.length === 0) return;

    const activeCount = rows.filter((row) => row.is_active).length;
    const labels = rows
      .slice(0, 3)
      .map((row) => row.label || row.token)
      .join(", ");
    const moreCount = rows.length > 3 ? rows.length - 3 : 0;
    const labelSummary = moreCount > 0 ? `${labels}, +${moreCount} more` : labels;

    const confirmed = window.confirm(
      rows.length === 1
        ? rows[0].is_active
          ? `Permanently delete active token "${rows[0].label}"?\n\nThe mobile device will stop working immediately. This cannot be undone.`
          : `Permanently delete token "${rows[0].label}"?\n\nLinked mobile profile (${formatTokenUser(rows[0].mobile_user)}) will be removed. This cannot be undone.`
        : `Permanently delete ${rows.length} access tokens?\n\n${labelSummary}${
            activeCount > 0
              ? `\n\n${activeCount} selected token(s) are still active and will stop working immediately.`
              : ""
          }\n\nThis cannot be undone.`
    );

    if (!confirmed) return;

    const isBulk = rows.length > 1;
    if (isBulk) setBulkDeleting(true);
    else setDeletingId(rows[0].id);
    setError("");

    try {
      const results = await Promise.all(
        rows.map(async (row) => {
          const res = await fetch(`/api/admin/access-tokens/${row.id}`, {
            method: "DELETE",
          });
          const data = await res.json();
          return { row, ok: res.ok, error: data.error };
        })
      );

      const failed = results.filter((result) => !result.ok);
      if (failed.length > 0) {
        throw new Error(
          failed.length === results.length
            ? failed[0].error || "Could not delete selected tokens."
            : `Deleted ${results.length - failed.length} of ${results.length}. ${failed[0].error || "Some tokens could not be deleted."}`
        );
      }

      const deletedIds = new Set(rows.map((row) => row.id));
      setCreatedTokens((prev) => prev.filter((row) => !deletedIds.has(row.id)));

      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (const id of deletedIds) next.delete(id);
        return next;
      });

      await loadTokens();
    } catch (err) {
      setError(err.message);
    } finally {
      if (isBulk) setBulkDeleting(false);
      else setDeletingId(null);
    }
  }

  async function handleDelete(tokenRow) {
    await deleteTokenRows([tokenRow]);
  }

  async function handleBulkDelete() {
    const rows = tokens.filter((row) => selectedIds.has(row.id));
    await deleteTokenRows(rows);
  }

  async function handleToggleActive(tokenRow, nextActive) {
    const actionLabel = nextActive ? "reactivate" : "deactivate";
    const confirmed = window.confirm(
      nextActive
        ? `Reactivate access token "${tokenRow.label}"? Mobile devices can use it again.`
        : `Deactivate access token "${tokenRow.label}"? Mobile devices using this token will stop sending location until it is reactivated.`
    );

    if (!confirmed) return;

    setUpdatingId(tokenRow.id);
    setError("");

    try {
      const res = await fetch(`/api/admin/access-tokens/${tokenRow.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: nextActive }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || `Could not ${actionLabel} token.`);
      }

      await loadTokens();
    } catch (err) {
      setError(err.message);
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <TokenQrModal
        token={qrView?.token}
        label={qrView?.label}
        onClose={() => setQrView(null)}
      />

      <QrSheetOverlay rows={qrSheetRows} onClose={() => setQrSheetRows(null)} />

      <div className="border-b border-border/60 bg-card/90 px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground sm:text-lg">
              Mobile Access Tokens
            </h2>
            <p className="mt-1 text-xs text-muted sm:text-sm">
              Create tokens for patrol mobile devices. Select multiple rows to delete in bulk, or use Deactivate to pause a unit.
            </p>
          </div>

          <form
            onSubmit={handleCreate}
            className="grid w-full max-w-2xl grid-cols-2 gap-2 sm:grid-cols-[1fr_1fr_auto_auto]"
          >
            <input
              type="text"
              value={station}
              onChange={(e) => setStation(e.target.value)}
              placeholder="Station (e.g. Rosario MPS)"
              className="w-full rounded-lg border border-border/80 bg-background/80 px-3 py-2 text-sm text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
            />
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Label (optional)"
              className="w-full rounded-lg border border-border/80 bg-background/80 px-3 py-2 text-sm text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
            />
            <input
              type="number"
              min={1}
              max={100}
              value={count}
              onChange={(e) => setCount(e.target.value)}
              title="How many tokens to create"
              className="w-full rounded-lg border border-border/80 bg-background/80 px-3 py-2 text-sm text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 sm:w-20"
            />
            <button
              type="submit"
              disabled={creating}
              className="shrink-0 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-background transition hover:bg-accent-dark disabled:opacity-50"
            >
              {creating ? "Creating..." : Number(count) > 1 ? `Create ${count}` : "Create Token"}
            </button>
          </form>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto px-4 py-4 sm:px-6">
        <div className="mx-auto max-w-6xl">
          {createdTokens.length > 0 && (
            <div className="mb-4 rounded-xl border border-accent/30 bg-accent/10 px-4 py-4 text-sm text-foreground">
              <p className="font-medium text-accent">
                {createdTokens.length === 1
                  ? "New access token created"
                  : `${createdTokens.length} access tokens created`}
              </p>
              <p className="mt-1 text-xs text-muted">
                Share with mobile devices via QR scan. 1 token = 1 phone.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setQrSheetRows(createdTokens)}
                  className="rounded-md border border-accent/30 bg-background/40 px-3 py-1.5 text-xs font-medium text-accent transition hover:bg-accent/10"
                >
                  Print QR sheet
                </button>
                {createdTokens.length === 1 && (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        setQrView({
                          token: createdTokens[0].token,
                          label: createdTokens[0].label,
                        })
                      }
                      className="rounded-md border border-accent/30 bg-background/40 px-3 py-1.5 text-xs font-medium text-accent transition hover:bg-accent/10"
                    >
                      View QR Code
                    </button>
                    <CopyButton value={createdTokens[0].token} />
                  </>
                )}
                <button
                  type="button"
                  onClick={() => setCreatedTokens([])}
                  className="rounded-md border border-border/70 px-3 py-1.5 text-xs font-medium text-muted transition hover:bg-background/80 hover:text-foreground"
                >
                  Dismiss
                </button>
              </div>
              {createdTokens.length === 1 && (
                <code className="mt-2 block break-all font-mono text-xs sm:text-sm">
                  {createdTokens[0].token}
                </code>
              )}
            </div>
          )}

          {error && (
            <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {!loading && tokens.length > 0 && (
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <label htmlFor="station-filter" className="text-xs text-muted">
                  Station
                </label>
                <select
                  id="station-filter"
                  value={stationFilter}
                  onChange={(e) => setStationFilter(e.target.value)}
                  className="rounded-lg border border-border/80 bg-background/80 px-2 py-1.5 text-xs text-foreground outline-none focus:border-accent"
                >
                  <option value="">All stations</option>
                  {stations.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                  <option value="__none__">No station</option>
                </select>
                <span className="text-xs text-muted">
                  {filteredTokens.length} shown
                </span>
              </div>
              <button
                type="button"
                onClick={() =>
                  setQrSheetRows(
                    selectedCount > 0
                      ? tokens.filter((row) => selectedIds.has(row.id))
                      : filteredTokens
                  )
                }
                className="rounded-lg border border-accent/30 px-3 py-1.5 text-xs font-medium text-accent transition hover:bg-accent/10"
              >
                {selectedCount > 0
                  ? `Print QR sheet (${selectedCount})`
                  : "Print QR sheet"}
              </button>
            </div>
          )}

          {loading ? (
            <div className="py-12 text-center text-sm text-muted">Loading access tokens...</div>
          ) : tokens.length === 0 ? (
            <div className="rounded-xl border border-border/70 bg-card/60 px-4 py-10 text-center text-sm text-muted">
              No access tokens yet. Create one above.
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-border/70 bg-card/80">
              {selectedCount > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 bg-background/40 px-4 py-2.5">
                  <p className="text-xs text-muted sm:text-sm">
                    <span className="font-medium text-foreground">{selectedCount}</span>{" "}
                    selected
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedIds(new Set())}
                      disabled={bulkDeleting}
                      className="rounded-md border border-border/70 px-3 py-1.5 text-[11px] font-medium text-muted transition hover:bg-background/80 hover:text-foreground disabled:opacity-50 sm:text-xs"
                    >
                      Clear selection
                    </button>
                    <button
                      type="button"
                      onClick={handleBulkDelete}
                      disabled={bulkDeleting}
                      className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-[11px] font-medium text-red-400 transition hover:bg-red-500/20 disabled:opacity-50 sm:text-xs"
                    >
                      {bulkDeleting ? "Deleting..." : `Delete selected (${selectedCount})`}
                    </button>
                  </div>
                </div>
              )}
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-border/70 bg-background/40 text-xs uppercase tracking-wide text-muted">
                    <tr>
                      <th className="w-10 px-3 py-3 font-medium">
                        <label className="sr-only" htmlFor="select-all-tokens">
                          Select all tokens
                        </label>
                        <input
                          id="select-all-tokens"
                          type="checkbox"
                          checked={allSelected}
                          ref={(input) => {
                            if (input) input.indeterminate = someSelected;
                          }}
                          onChange={(e) => toggleSelectAll(e.target.checked)}
                          className="h-4 w-4 accent-accent"
                        />
                      </th>
                      <th className="px-4 py-3 font-medium">Label</th>
                      <th className="px-4 py-3 font-medium">Station</th>
                      <th className="px-4 py-3 font-medium">Access Token</th>
                      <th className="px-4 py-3 font-medium">Mobile User / Unit</th>
                      <th className="px-4 py-3 font-medium">Created By</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {filteredTokens.map((row) => (
                      <tr
                        key={row.id}
                        className={`text-foreground/90 ${
                          selectedIds.has(row.id) ? "bg-accent/5" : ""
                        }`}
                      >
                        <td className="px-3 py-3 align-top">
                          <label className="sr-only" htmlFor={`select-token-${row.id}`}>
                            Select {row.label || row.token}
                          </label>
                          <input
                            id={`select-token-${row.id}`}
                            type="checkbox"
                            checked={selectedIds.has(row.id)}
                            onChange={(e) => toggleSelected(row.id, e.target.checked)}
                            className="h-4 w-4 accent-accent"
                          />
                        </td>
                        <td className="px-4 py-3 align-top">
                          <div className="font-medium text-foreground">{row.label || "—"}</div>
                          <div className="mt-1 text-[11px] text-muted">{formatDate(row.created_at)}</div>
                        </td>
                        <td className="px-4 py-3 align-top">
                          {row.station ? (
                            <span className="inline-flex rounded-full bg-background/60 px-2.5 py-1 text-[11px] font-medium text-foreground/80">
                              {row.station}
                            </span>
                          ) : (
                            <span className="text-[11px] text-muted">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 align-top">
                          <div className="flex flex-wrap items-start gap-2">
                            <code className="break-all font-mono text-[11px] sm:text-xs">{row.token}</code>
                            <CopyButton value={row.token} />
                            {row.is_active && (
                              <button
                                type="button"
                                onClick={() => setQrView({ token: row.token, label: row.label })}
                                className="rounded-md border border-accent/30 px-2 py-1 text-[10px] font-medium text-accent transition hover:bg-accent/10 sm:text-[11px]"
                              >
                                View QR Code
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 align-top">
                          <div>{formatTokenUser(row.mobile_user)}</div>
                          {row.mobile_user?.mobile_phone && (
                            <div className="mt-1 text-[11px] text-muted">
                              {row.mobile_user.mobile_phone}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 align-top text-xs text-muted">
                          {row.created_by?.name || "System seed"}
                        </td>
                        <td className="px-4 py-3 align-top">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium ${
                              row.is_active
                                ? "bg-accent/15 text-accent"
                                : "bg-red-500/10 text-red-400"
                            }`}
                          >
                            {row.is_active ? "Active" : "Deactivated"}
                          </span>
                        </td>
                        <td className="px-4 py-3 align-top">
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              disabled={
                                updatingId === row.id ||
                                deletingId === row.id ||
                                bulkDeleting
                              }
                              onClick={() => handleToggleActive(row, !row.is_active)}
                              className={`rounded-md border px-3 py-1.5 text-[11px] font-medium transition disabled:opacity-50 sm:text-xs ${
                                row.is_active
                                  ? "border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                                  : "border-accent/30 text-accent hover:bg-accent/10"
                              }`}
                            >
                              {updatingId === row.id
                                ? "Saving..."
                                : row.is_active
                                  ? "Deactivate"
                                  : "Reactivate"}
                            </button>
                            <button
                              type="button"
                              disabled={
                                updatingId === row.id ||
                                deletingId === row.id ||
                                bulkDeleting
                              }
                              onClick={() => handleDelete(row)}
                              className="rounded-md border border-red-500/30 px-3 py-1.5 text-[11px] font-medium text-red-400 transition hover:bg-red-500/10 disabled:opacity-50 sm:text-xs"
                            >
                              {deletingId === row.id ? "Deleting..." : "Delete"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
