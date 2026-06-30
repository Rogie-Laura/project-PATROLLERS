"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  officeSelectOptions,
  unitSelectOptions,
} from "@/lib/offices";
import { subscriptionStatus } from "@/lib/auth/subscription";

const ROLE_OPTIONS = [
  { value: "RCC", label: "RCC — Regional (whole region)" },
  { value: "PCC", label: "PCC — Provincial (one office)" },
  { value: "SCC", label: "Station (one office + unit)" },
];

const EMPTY_FORM = {
  rank: "",
  full_name: "",
  email: "",
  badge_number: "",
  password: "",
  role: "SCC",
  office: "",
  unit: "",
  subscription_expires_at: "",
};

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

function formatDateOnly(value) {
  if (!value) return "No expiry";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "No expiry";
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** ISO timestamp -> "YYYY-MM-DD" for <input type="date">. */
function toDateInputValue(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

const STATUS_STYLES = {
  active: "bg-emerald-500/15 text-emerald-400",
  expiring: "bg-amber-500/15 text-amber-400",
  expired: "bg-red-500/15 text-red-400",
  inactive: "bg-zinc-500/20 text-zinc-400",
};

const STATUS_LABELS = {
  active: "Active",
  expiring: "Expiring soon",
  expired: "Expired",
  inactive: "Deactivated",
};

function StatusBadge({ account }) {
  const status = subscriptionStatus(account);
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-medium sm:text-sm ${
        STATUS_STYLES[status] ?? STATUS_STYLES.inactive
      }`}
    >
      {STATUS_LABELS[status] ?? "Unknown"}
    </span>
  );
}

function displayAccountName(row) {
  const combined = row.rank_fullname?.trim()
    || [row.rank, row.full_name].filter(Boolean).join(" ").trim();
  return combined || row.email || "—";
}

function scopeHint(role) {
  if (role === "RCC") return "Sees the whole region. Office/Unit optional.";
  if (role === "PCC") return "Sees one office. Select a PPO below.";
  return "Sees one station. Select office, then unit.";
}

const selectClassName =
  "mt-1.5 w-full rounded-lg border border-border/80 bg-background/80 px-3.5 py-2.5 text-sm sm:text-base text-foreground outline-none focus:border-accent";

const fieldInputClassName = selectClassName;

const fieldLabelClassName = "block text-sm font-medium text-muted";

function OfficeUnitFields({ role, office, unit, onOfficeChange, onUnitChange }) {
  const offices = useMemo(() => officeSelectOptions(office), [office]);
  const units = useMemo(
    () => unitSelectOptions(office, unit),
    [office, unit]
  );
  const showOffice = role === "PCC" || role === "SCC";
  const showUnit = role === "SCC";

  if (!showOffice && !showUnit) return null;

  return (
    <div className={`grid gap-4 ${showUnit ? "md:grid-cols-2" : "grid-cols-1"}`}>
      {showOffice && (
        <label className={fieldLabelClassName}>
          Office
          <select
            value={office}
            onChange={(e) => onOfficeChange(e.target.value)}
            required={role === "PCC" || role === "SCC"}
            className={selectClassName}
          >
            <option value="">Select office…</option>
            {offices.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
      )}
      {showUnit && (
        <label className={fieldLabelClassName}>
          Unit / Station
          <select
            value={unit}
            onChange={(e) => onUnitChange(e.target.value)}
            required
            disabled={!office}
            className={`${selectClassName} disabled:opacity-50`}
          >
            <option value="">
              {office ? "Select unit…" : "Select office first"}
            </option>
            {units.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
      )}
    </div>
  );
}

function EditModal({ account, onClose, onSaved, onError }) {
  const [form, setForm] = useState({
    role: account.role,
    office: account.office,
    unit: account.unit,
    rank: account.rank,
    full_name: account.full_name,
    badge_number: account.badge_number,
    email: account.email,
    password: "",
    is_active: account.is_active !== false,
    subscription_expires_at: toDateInputValue(account.subscription_expires_at),
  });
  const [saving, setSaving] = useState(false);

  function update(field, value) {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "role") {
        if (value === "RCC") {
          next.office = "";
          next.unit = "";
        } else if (value === "PCC") {
          next.unit = "";
        }
      }
      if (field === "office") {
        const validUnits = unitSelectOptions(value, prev.unit);
        if (prev.unit && !validUnits.includes(prev.unit)) {
          next.unit = "";
        }
      }
      return next;
    });
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    onError("");
    try {
      const payload = {
        role: form.role,
        office: form.office.trim(),
        unit: form.unit.trim(),
        rank: form.rank.trim(),
        full_name: form.full_name.trim(),
        badge_number: form.badge_number.trim(),
        email: form.email.trim(),
        is_active: form.is_active,
        subscription_expires_at: form.subscription_expires_at || null,
      };
      if (form.password) payload.password = form.password;

      const res = await fetch(`/api/admin/users/${account.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not update account.");
      onSaved();
    } catch (err) {
      onError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="presentation"
      onClick={onClose}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSave}
        className="w-full max-w-3xl rounded-xl border border-border/70 bg-card p-5 shadow-xl sm:p-6"
      >
        <h3 className="text-base font-semibold text-foreground">Edit account</h3>
        <p className="mt-1 text-sm text-muted">{form.email}</p>

        <div className="mt-5 grid grid-cols-1 gap-4">
          <label className={fieldLabelClassName}>
            Role
            <select
              value={form.role}
              onChange={(e) => update("role", e.target.value)}
              className={selectClassName}
            >
              {ROLE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
          <p className="-mt-2 text-xs text-muted sm:text-sm">{scopeHint(form.role)}</p>

          <OfficeUnitFields
            role={form.role}
            office={form.office}
            unit={form.unit}
            onOfficeChange={(value) => update("office", value)}
            onUnitChange={(value) => update("unit", value)}
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className={fieldLabelClassName}>
              Rank
              <input
                value={form.rank}
                onChange={(e) => update("rank", e.target.value)}
                className={fieldInputClassName}
              />
            </label>
            <label className={fieldLabelClassName}>
              Full name
              <input
                value={form.full_name}
                onChange={(e) => update("full_name", e.target.value)}
                className={fieldInputClassName}
              />
            </label>
          </div>

          <label className={fieldLabelClassName}>
            New password (leave blank to keep current)
            <input
              type="text"
              value={form.password}
              onChange={(e) => update("password", e.target.value)}
              placeholder="••••••"
              className={fieldInputClassName}
            />
          </label>

          <div className="rounded-lg border border-border/60 bg-background/40 p-4">
            <label className="flex cursor-pointer items-center justify-between gap-3">
              <span className="text-sm font-medium text-foreground">
                Account active
              </span>
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => update("is_active", e.target.checked)}
                className="h-4 w-4 accent-accent"
              />
            </label>
            <label className={`${fieldLabelClassName} mt-4`}>
              Subscription expires on (leave blank = never)
              <input
                type="date"
                value={form.subscription_expires_at}
                onChange={(e) =>
                  update("subscription_expires_at", e.target.value)
                }
                className={fieldInputClassName}
              />
            </label>
            <p className="mt-2 text-xs text-muted sm:text-sm">
              After this date the account is automatically blocked from signing
              in until you renew it.
            </p>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border/70 px-4 py-2.5 text-sm font-medium text-muted transition hover:bg-background/80 hover:text-foreground"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-background transition hover:bg-accent-dark disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save changes"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function MonitoringAccountsManager() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [togglingId, setTogglingId] = useState(null);
  const [editing, setEditing] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const loadUsers = useCallback(async () => {
    setError("");
    const res = await fetch("/api/admin/users");
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Could not load accounts.");
    setUsers(data.users ?? []);
  }, []);

  useEffect(() => {
    loadUsers()
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [loadUsers]);

  function updateForm(field, value) {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "role") {
        if (value === "RCC") {
          next.office = "";
          next.unit = "";
        } else if (value === "PCC") {
          next.unit = "";
        }
      }
      if (field === "office") {
        const validUnits = unitSelectOptions(value, prev.unit);
        if (prev.unit && !validUnits.includes(prev.unit)) {
          next.unit = "";
        }
      }
      return next;
    });
  }

  async function handleCreate(e) {
    e.preventDefault();
    setCreating(true);
    setError("");
    setCreated(null);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not create account.");
      setCreated(data.user);
      setForm(EMPTY_FORM);
      setShowCreateForm(false);
      await loadUsers();
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  }

  async function handleToggleActive(account) {
    const nextActive = !(account.is_active !== false);
    setTogglingId(account.id);
    setError("");
    try {
      const res = await fetch(`/api/admin/users/${account.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: nextActive }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not update account.");
      await loadUsers();
    } catch (err) {
      setError(err.message);
    } finally {
      setTogglingId(null);
    }
  }

  async function handleDelete(account) {
    const confirmed = window.confirm(
      `Delete account "${account.rank_fullname || account.email}" (${account.role_label})?\n\nThey will no longer be able to sign in. This cannot be undone.`
    );
    if (!confirmed) return;

    setDeletingId(account.id);
    setError("");
    try {
      const res = await fetch(`/api/admin/users/${account.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not delete account.");
      await loadUsers();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeletingId(null);
    }
  }

  const roleHint = useMemo(() => scopeHint(form.role), [form.role]);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {editing && (
        <EditModal
          account={editing}
          onClose={() => setEditing(null)}
          onError={setError}
          onSaved={() => {
            setEditing(null);
            loadUsers().catch((err) => setError(err.message));
          }}
        />
      )}

      <div className="min-h-0 flex-1 overflow-auto px-4 py-5 sm:px-6">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground sm:text-xl">
                Monitoring Accounts
              </h2>
              <p className="mt-1 text-sm text-muted">
                Manage RCC, PCC, and Station sign-ins. Only email, role, and password
                are required when creating an account.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowCreateForm((open) => !open)}
              className="shrink-0 rounded-lg border border-accent/40 bg-accent/10 px-4 py-2.5 text-sm font-semibold text-accent transition hover:bg-accent/20"
            >
              {showCreateForm ? "Hide create form" : "Create new account"}
            </button>
          </div>

          {created && (
            <div className="rounded-xl border border-accent/30 bg-accent/10 px-4 py-3 text-sm text-foreground">
              <p className="font-medium text-accent">Account created</p>
              <p className="mt-1 text-sm text-muted">
                {created.role_label} — {created.email}
                {created.office ? ` · ${created.office}` : ""}
                {created.unit ? ` / ${created.unit}` : ""}. They can sign in with
                this email and the password you set.
              </p>
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <section>
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="text-base font-semibold text-foreground sm:text-lg">
                All accounts
                {!loading && (
                  <span className="ml-2 text-sm font-normal text-muted">
                    ({users.length})
                  </span>
                )}
              </h3>
            </div>

            {loading ? (
              <div className="rounded-xl border border-border/70 bg-card/60 py-12 text-center text-sm text-muted">
                Loading accounts...
              </div>
            ) : users.length === 0 ? (
              <div className="rounded-xl border border-border/70 bg-card/60 px-4 py-10 text-center text-sm text-muted">
                No monitoring accounts yet. Click{" "}
                <button
                  type="button"
                  onClick={() => setShowCreateForm(true)}
                  className="font-medium text-accent underline-offset-2 hover:underline"
                >
                  Create new account
                </button>{" "}
                to add one.
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-border/70 bg-card/80">
                <div className="overflow-x-auto">
                  <table className="min-w-[960px] w-full text-left">
                    <thead className="border-b border-border/70 bg-background/40 text-xs uppercase tracking-wide text-muted sm:text-sm">
                      <tr>
                        <th className="px-5 py-4 font-medium">Account</th>
                        <th className="min-w-[220px] px-5 py-4 font-medium">Email</th>
                        <th className="px-5 py-4 font-medium">Role</th>
                        <th className="min-w-[160px] px-5 py-4 font-medium">Office</th>
                        <th className="min-w-[160px] px-5 py-4 font-medium">Unit</th>
                        <th className="min-w-[140px] px-5 py-4 font-medium">Status</th>
                        <th className="min-w-[220px] px-5 py-4 font-medium">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60 text-sm sm:text-base">
                      {users.map((row) => {
                        const isAdmin = row.role === "System Administrator";
                        const accountName = displayAccountName(row);
                        const showEmailAsSecondary =
                          accountName !== row.email && Boolean(row.email);

                        return (
                          <tr key={row.id} className="text-foreground/90">
                            <td className="px-5 py-4 align-top">
                              <div className="font-semibold text-foreground">
                                {accountName}
                              </div>
                              {showEmailAsSecondary && (
                                <div className="mt-1 text-xs text-muted sm:text-sm">
                                  {row.email}
                                </div>
                              )}
                              {row.badge_number ? (
                                <div className="mt-1 text-xs text-muted sm:text-sm">
                                  Badge: {row.badge_number}
                                </div>
                              ) : null}
                              <div className="mt-1 text-xs text-muted sm:text-sm">
                                Created {formatDate(row.created_at)}
                              </div>
                            </td>
                            <td className="px-5 py-4 align-top break-words">{row.email || "—"}</td>
                            <td className="px-5 py-4 align-top">
                              <span className="inline-flex rounded-full bg-accent/15 px-3 py-1 text-xs font-medium text-accent sm:text-sm">
                                {row.role}
                              </span>
                            </td>
                            <td className="px-5 py-4 align-top break-words">{row.office || "—"}</td>
                            <td className="px-5 py-4 align-top break-words">{row.unit || "—"}</td>
                            <td className="px-5 py-4 align-top">
                              {isAdmin ? (
                                <span className="text-sm text-muted">—</span>
                              ) : (
                                <div>
                                  <StatusBadge account={row} />
                                  <div className="mt-1.5 text-xs text-muted sm:text-sm">
                                    {formatDateOnly(row.subscription_expires_at)}
                                  </div>
                                </div>
                              )}
                            </td>
                            <td className="px-5 py-4 align-top">
                              {isAdmin ? (
                                <span className="text-sm text-muted">
                                  System Administrator
                                </span>
                              ) : (
                                <div className="flex flex-wrap gap-2">
                                  <button
                                    type="button"
                                    disabled={togglingId === row.id}
                                    onClick={() => handleToggleActive(row)}
                                    className={`rounded-md border px-3.5 py-2 text-xs font-medium transition disabled:opacity-50 sm:text-sm ${
                                      row.is_active !== false
                                        ? "border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                                        : "border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                                    }`}
                                  >
                                    {togglingId === row.id
                                      ? "Saving..."
                                      : row.is_active !== false
                                      ? "Deactivate"
                                      : "Activate"}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditing(row)}
                                    className="rounded-md border border-accent/30 px-3.5 py-2 text-xs font-medium text-accent transition hover:bg-accent/10 sm:text-sm"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    disabled={deletingId === row.id}
                                    onClick={() => handleDelete(row)}
                                    className="rounded-md border border-red-500/30 px-3.5 py-2 text-xs font-medium text-red-400 transition hover:bg-red-500/10 disabled:opacity-50 sm:text-sm"
                                  >
                                    {deletingId === row.id ? "Deleting..." : "Delete"}
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>

          {showCreateForm && (
            <section className="rounded-xl border border-border/70 bg-background/30 p-4 sm:p-5">
              <h3 className="text-sm font-semibold text-foreground sm:text-base">
                Create new account
              </h3>
              <p className="mt-1 text-sm text-muted">
                Rank, full name, and badge number are optional and can be left blank.
              </p>

              <form onSubmit={handleCreate} className="mt-4 space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <label className={fieldLabelClassName}>
                    Rank <span className="font-normal text-muted">(optional)</span>
                    <input
                      type="text"
                      value={form.rank}
                      onChange={(e) => updateForm("rank", e.target.value)}
                      placeholder="e.g. PSSg"
                      className={fieldInputClassName}
                    />
                  </label>
                  <label className={fieldLabelClassName}>
                    Full name <span className="font-normal text-muted">(optional)</span>
                    <input
                      type="text"
                      value={form.full_name}
                      onChange={(e) => updateForm("full_name", e.target.value)}
                      placeholder="Complete name"
                      className={fieldInputClassName}
                    />
                  </label>
                  <label className={fieldLabelClassName}>
                    Email (login) <span className="text-accent">*</span>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => updateForm("email", e.target.value)}
                      placeholder="name@example.com"
                      required
                      className={fieldInputClassName}
                    />
                  </label>
                  <label className={fieldLabelClassName}>
                    Badge number <span className="font-normal text-muted">(optional)</span>
                    <input
                      type="text"
                      value={form.badge_number}
                      onChange={(e) => updateForm("badge_number", e.target.value)}
                      placeholder="Leave blank if none"
                      className={fieldInputClassName}
                    />
                  </label>
                  <label className={fieldLabelClassName}>
                    Role <span className="text-accent">*</span>
                    <select
                      value={form.role}
                      onChange={(e) => updateForm("role", e.target.value)}
                      className={selectClassName}
                    >
                      {ROLE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className={fieldLabelClassName}>
                    Password <span className="text-accent">*</span>
                    <input
                      type="text"
                      value={form.password}
                      onChange={(e) => updateForm("password", e.target.value)}
                      placeholder="Minimum 6 characters"
                      required
                      className={fieldInputClassName}
                    />
                  </label>
                </div>

                <OfficeUnitFields
                  role={form.role}
                  office={form.office}
                  unit={form.unit}
                  onOfficeChange={(value) => updateForm("office", value)}
                  onUnitChange={(value) => updateForm("unit", value)}
                />

                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <label className={fieldLabelClassName}>
                    Subscription expires on{" "}
                    <span className="font-normal text-muted">(optional)</span>
                    <input
                      type="date"
                      value={form.subscription_expires_at}
                      onChange={(e) =>
                        updateForm("subscription_expires_at", e.target.value)
                      }
                      className={fieldInputClassName}
                    />
                  </label>
                </div>

                <div className="flex flex-col gap-3 border-t border-border/60 pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-muted">{roleHint}</p>
                  <button
                    type="submit"
                    disabled={creating}
                    className="shrink-0 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-background transition hover:bg-accent-dark disabled:opacity-50 sm:text-base"
                  >
                    {creating ? "Creating..." : "Create account"}
                  </button>
                </div>
              </form>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
