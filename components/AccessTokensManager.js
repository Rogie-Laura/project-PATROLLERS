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

export default function AccessTokensManager() {
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [label, setLabel] = useState("");
  const [creating, setCreating] = useState(false);
  const [createdToken, setCreatedToken] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [qrView, setQrView] = useState(null);

  const allSelected =
    tokens.length > 0 && tokens.every((row) => selectedIds.has(row.id));
  const someSelected =
    tokens.some((row) => selectedIds.has(row.id)) && !allSelected;
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
    setCreatedToken(null);

    try {
      const res = await fetch("/api/admin/access-tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: label.trim() || "Mobile Patrol Device" }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Could not create access token.");
      }

      setCreatedToken(data.token);
      setLabel("");
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
    setSelectedIds(new Set(tokens.map((row) => row.id)));
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
      if (createdToken?.id && deletedIds.has(createdToken.id)) {
        setCreatedToken(null);
      }

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

          <form onSubmit={handleCreate} className="flex w-full max-w-xl flex-col gap-2 sm:flex-row">
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Token label (e.g. Alpha Mobile 1)"
              className="w-full rounded-lg border border-border/80 bg-background/80 px-3 py-2 text-sm text-foreground outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
            />
            <button
              type="submit"
              disabled={creating}
              className="shrink-0 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-background transition hover:bg-accent-dark disabled:opacity-50"
            >
              {creating ? "Creating..." : "Create Token"}
            </button>
          </form>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto px-4 py-4 sm:px-6">
        <div className="mx-auto max-w-6xl">
          {createdToken && (
            <div className="mb-4 rounded-xl border border-accent/30 bg-accent/10 px-4 py-4 text-sm text-foreground">
              <p className="font-medium text-accent">New access token created</p>
              <p className="mt-1 text-xs text-muted">
                Share this token with the mobile device via QR scan or copy.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setQrView({ token: createdToken.token, label: createdToken.label })
                  }
                  className="rounded-md border border-accent/30 bg-background/40 px-3 py-1.5 text-xs font-medium text-accent transition hover:bg-accent/10"
                >
                  View QR Code
                </button>
                <CopyButton value={createdToken.token} />
              </div>
              <code className="mt-2 block break-all font-mono text-xs sm:text-sm">
                {createdToken.token}
              </code>
            </div>
          )}

          {error && (
            <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error}
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
                      <th className="px-4 py-3 font-medium">Access Token</th>
                      <th className="px-4 py-3 font-medium">Mobile User / Unit</th>
                      <th className="px-4 py-3 font-medium">Created By</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {tokens.map((row) => (
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
