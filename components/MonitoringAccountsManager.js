"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

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
};

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString();
}

function scopeHint(role) {
  if (role === "RCC") return "Sees the whole region. Office/Unit optional.";
  if (role === "PCC") return "Sees one office. Office required (e.g. Cavite PPO).";
  return "Sees one station. Office + Unit required (e.g. Cavite PPO / Rosario MPS).";
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
  });
  const [saving, setSaving] = useState(false);

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
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
        className="w-full max-w-md rounded-xl border border-border/70 bg-card p-5 shadow-xl"
      >
        <h3 className="text-sm font-semibold text-foreground">Edit account</h3>
        <p className="mt-1 text-xs text-muted">{form.email}</p>

        <div className="mt-4 grid grid-cols-1 gap-3">
          <label className="text-xs text-muted">
            Role
            <select
              value={form.role}
              onChange={(e) => update("role", e.target.value)}
              className="mt-1 w-full rounded-lg border border-border/80 bg-background/80 px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
            >
              {ROLE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
          <p className="-mt-1 text-[11px] text-muted">{scopeHint(form.role)}</p>

          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs text-muted">
              Office
              <input
                value={form.office}
                onChange={(e) => update("office", e.target.value)}
                placeholder="Cavite PPO"
                className="mt-1 w-full rounded-lg border border-border/80 bg-background/80 px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
              />
            </label>
            <label className="text-xs text-muted">
              Unit
              <input
                value={form.unit}
                onChange={(e) => update("unit", e.target.value)}
                placeholder="Rosario MPS"
                className="mt-1 w-full rounded-lg border border-border/80 bg-background/80 px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs text-muted">
              Rank
              <input
                value={form.rank}
                onChange={(e) => update("rank", e.target.value)}
                className="mt-1 w-full rounded-lg border border-border/80 bg-background/80 px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
              />
            </label>
            <label className="text-xs text-muted">
              Full name
              <input
                value={form.full_name}
                onChange={(e) => update("full_name", e.target.value)}
                className="mt-1 w-full rounded-lg border border-border/80 bg-background/80 px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
              />
            </label>
          </div>

          <label className="text-xs text-muted">
            New password (leave blank to keep current)
            <input
              type="text"
              value={form.password}
              onChange={(e) => update("password", e.target.value)}
              placeholder="••••••"
              className="mt-1 w-full rounded-lg border border-border/80 bg-background/80 px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
            />
          </label>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border/70 px-4 py-2 text-sm font-medium text-muted transition hover:bg-background/80 hover:text-foreground"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-background transition hover:bg-accent-dark disabled:opacity-50"
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
  const [editing, setEditing] = useState(null);

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
    setForm((prev) => ({ ...prev, [field]: value }));
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
      await loadUsers();
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
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
    <div className="flex min-h-0 flex-1 flex-col">
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

      <div className="border-b border-border/60 bg-card/90 px-4 py-3 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-base font-semibold text-foreground sm:text-lg">
            Monitoring Accounts
          </h2>
          <p className="mt-1 text-xs text-muted sm:text-sm">
            Create RCC, PCC, and Station sign-ins. Each account only sees markers
            within its scope and cannot open Access Tokens or System Settings.
          </p>

          <form
            onSubmit={handleCreate}
            className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4"
          >
            <input
              type="text"
              value={form.rank}
              onChange={(e) => updateForm("rank", e.target.value)}
              placeholder="Rank (e.g. PSSg)"
              className="w-full rounded-lg border border-border/80 bg-background/80 px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
            />
            <input
              type="text"
              value={form.full_name}
              onChange={(e) => updateForm("full_name", e.target.value)}
              placeholder="Full name"
              className="w-full rounded-lg border border-border/80 bg-background/80 px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
            />
            <input
              type="email"
              value={form.email}
              onChange={(e) => updateForm("email", e.target.value)}
              placeholder="Email (login)"
              required
              className="w-full rounded-lg border border-border/80 bg-background/80 px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
            />
            <input
              type="text"
              value={form.badge_number}
              onChange={(e) => updateForm("badge_number", e.target.value)}
              placeholder="Badge number (optional)"
              className="w-full rounded-lg border border-border/80 bg-background/80 px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
            />
            <select
              value={form.role}
              onChange={(e) => updateForm("role", e.target.value)}
              className="w-full rounded-lg border border-border/80 bg-background/80 px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
            >
              {ROLE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={form.office}
              onChange={(e) => updateForm("office", e.target.value)}
              placeholder="Office (e.g. Cavite PPO)"
              className="w-full rounded-lg border border-border/80 bg-background/80 px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
            />
            <input
              type="text"
              value={form.unit}
              onChange={(e) => updateForm("unit", e.target.value)}
              placeholder="Unit (e.g. Rosario MPS)"
              className="w-full rounded-lg border border-border/80 bg-background/80 px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
            />
            <input
              type="text"
              value={form.password}
              onChange={(e) => updateForm("password", e.target.value)}
              placeholder="Password (min 6)"
              required
              className="w-full rounded-lg border border-border/80 bg-background/80 px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
            />
            <div className="sm:col-span-2 lg:col-span-4 flex flex-wrap items-center justify-between gap-2">
              <p className="text-[11px] text-muted">{roleHint}</p>
              <button
                type="submit"
                disabled={creating}
                className="shrink-0 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-background transition hover:bg-accent-dark disabled:opacity-50"
              >
                {creating ? "Creating..." : "Create account"}
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto px-4 py-4 sm:px-6">
        <div className="mx-auto max-w-6xl">
          {created && (
            <div className="mb-4 rounded-xl border border-accent/30 bg-accent/10 px-4 py-3 text-sm text-foreground">
              <p className="font-medium text-accent">Account created</p>
              <p className="mt-1 text-xs text-muted">
                {created.role_label} — {created.email}
                {created.office ? ` · ${created.office}` : ""}
                {created.unit ? ` / ${created.unit}` : ""}. They can sign in with
                this email and the password you set.
              </p>
            </div>
          )}

          {error && (
            <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {loading ? (
            <div className="py-12 text-center text-sm text-muted">
              Loading accounts...
            </div>
          ) : users.length === 0 ? (
            <div className="rounded-xl border border-border/70 bg-card/60 px-4 py-10 text-center text-sm text-muted">
              No monitoring accounts yet. Create one above.
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-border/70 bg-card/80">
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-border/70 bg-background/40 text-xs uppercase tracking-wide text-muted">
                    <tr>
                      <th className="px-4 py-3 font-medium">Name</th>
                      <th className="px-4 py-3 font-medium">Email</th>
                      <th className="px-4 py-3 font-medium">Role</th>
                      <th className="px-4 py-3 font-medium">Office</th>
                      <th className="px-4 py-3 font-medium">Unit</th>
                      <th className="px-4 py-3 font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {users.map((row) => {
                      const isAdmin = row.role === "System Administrator";
                      return (
                        <tr key={row.id} className="text-foreground/90">
                          <td className="px-4 py-3 align-top">
                            <div className="font-medium text-foreground">
                              {row.rank_fullname || row.full_name || "—"}
                            </div>
                            <div className="mt-1 text-[11px] text-muted">
                              {formatDate(row.created_at)}
                            </div>
                          </td>
                          <td className="px-4 py-3 align-top">{row.email || "—"}</td>
                          <td className="px-4 py-3 align-top">
                            <span className="inline-flex rounded-full bg-accent/15 px-2.5 py-1 text-[11px] font-medium text-accent">
                              {row.role}
                            </span>
                          </td>
                          <td className="px-4 py-3 align-top">{row.office || "—"}</td>
                          <td className="px-4 py-3 align-top">{row.unit || "—"}</td>
                          <td className="px-4 py-3 align-top">
                            {isAdmin ? (
                              <span className="text-[11px] text-muted">
                                System Administrator
                              </span>
                            ) : (
                              <div className="flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={() => setEditing(row)}
                                  className="rounded-md border border-accent/30 px-3 py-1.5 text-[11px] font-medium text-accent transition hover:bg-accent/10 sm:text-xs"
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  disabled={deletingId === row.id}
                                  onClick={() => handleDelete(row)}
                                  className="rounded-md border border-red-500/30 px-3 py-1.5 text-[11px] font-medium text-red-400 transition hover:bg-red-500/10 disabled:opacity-50 sm:text-xs"
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
        </div>
      </div>
    </div>
  );
}
