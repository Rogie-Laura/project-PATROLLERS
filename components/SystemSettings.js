"use client";

import { useCallback, useEffect, useState } from "react";

function SettingCard({ title, description, children }) {
  return (
    <div className="rounded-xl border border-border/70 bg-card/80 p-4 sm:p-5">
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      {description && (
        <p className="mt-1 text-xs leading-relaxed text-muted">{description}</p>
      )}
      <div className="mt-3">{children}</div>
    </div>
  );
}

function ReadOnlyValue({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border/50 bg-background/50 px-3 py-2.5">
      <span className="text-xs text-muted">{label}</span>
      <span className="text-right text-sm font-medium text-foreground">{value}</span>
    </div>
  );
}

export default function SystemSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [intervalSeconds, setIntervalSeconds] = useState(1800);
  const [intervalLabel, setIntervalLabel] = useState("");
  const [minSeconds, setMinSeconds] = useState(30);
  const [maxSeconds, setMaxSeconds] = useState(86400);

  const [value, setValue] = useState("30");
  const [unit, setUnit] = useState("minutes");

  const applySettings = useCallback((settings) => {
    const seconds = settings.location_interval_seconds ?? 1800;
    setIntervalSeconds(seconds);
    setIntervalLabel(settings.interval_label ?? "");
    setMinSeconds(settings.min_seconds ?? 30);
    setMaxSeconds(settings.max_seconds ?? 86400);

    if (seconds % 60 === 0 && seconds >= 60) {
      setUnit("minutes");
      setValue(String(seconds / 60));
    } else {
      setUnit("seconds");
      setValue(String(seconds));
    }
  }, []);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/admin/system-settings");
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Could not load settings.");
      }

      applySettings(data.settings);
    } catch (err) {
      setError(err.message ?? "Could not load settings.");
    } finally {
      setLoading(false);
    }
  }, [applySettings]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  async function handleSave(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/admin/system-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value: Number(value), unit }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Could not save settings.");
      }

      applySettings(data.settings);
      setSuccess(
        "Saved. Mobile devices will use this interval the next time they validate their access token or restart tracking."
      );
    } catch (err) {
      setError(err.message ?? "Could not save settings.");
    } finally {
      setSaving(false);
    }
  }

  const maxMinutes = Math.floor(maxSeconds / 60);
  const minMinutes = Math.max(1, Math.ceil(minSeconds / 60));
  const maxValue = unit === "minutes" ? maxMinutes : maxSeconds;
  const minValue = unit === "minutes" ? minMinutes : minSeconds;

  function handleUnitChange(newUnit) {
    const amount = Number(value);
    if (!Number.isFinite(amount) || amount <= 0) {
      setUnit(newUnit);
      return;
    }

    const asSeconds = unit === "minutes" ? amount * 60 : amount;

    if (newUnit === "minutes") {
      setValue(String(Math.max(minMinutes, Math.ceil(asSeconds / 60))));
    } else {
      setValue(String(Math.max(minSeconds, Math.round(asSeconds))));
    }
    setUnit(newUnit);
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
      <div className="mx-auto max-w-2xl space-y-4">
        <div>
          <h1 className="text-lg font-semibold text-foreground">System Settings</h1>
          <p className="mt-1 text-sm text-muted">
            Configure how often patrol devices send GPS while live tracking is active.
          </p>
        </div>

        {error && (
          <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
            {error}
          </p>
        )}

        {success && (
          <p className="rounded-lg border border-accent/30 bg-accent/10 px-3 py-2 text-sm text-accent">
            {success}
          </p>
        )}

        <SettingCard
          title="Mobile location updates"
          description="How often patrol devices send GPS updates while live tracking is active."
        >
          <ReadOnlyValue
            label="Current interval"
            value={loading ? "Loading..." : intervalLabel || `Every ${intervalSeconds} seconds`}
          />

          <form onSubmit={handleSave} className="mt-4 space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted">
                New interval
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min={minValue}
                  max={maxValue}
                  step={1}
                  required
                  disabled={loading || saving}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  className="min-w-0 flex-1 rounded-lg border border-border/70 bg-background/80 px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
                />
                <select
                  value={unit}
                  disabled={loading || saving}
                  onChange={(e) => handleUnitChange(e.target.value)}
                  className="rounded-lg border border-border/70 bg-background/80 px-2 py-2 text-sm text-foreground outline-none focus:border-accent"
                >
                  <option value="seconds">Seconds</option>
                  <option value="minutes">Minutes</option>
                </select>
              </div>
              <p className="mt-1.5 text-[11px] text-muted">
                Allowed: {minSeconds} seconds (min {minMinutes} min) up to {maxSeconds}{" "}
                seconds (max {maxMinutes} min). Use seconds for intervals under 1 minute.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || saving}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-background transition hover:bg-accent-dark disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save interval"}
            </button>
          </form>

          <p className="mt-3 text-[11px] text-muted">
            Stored in the database and sent to mobile apps on token validation. Patrol
            phones already logged in may need to re-enter their token or restart live
            tracking to pick up a new interval.
          </p>
        </SettingCard>

        <SettingCard
          title="Patrol status"
          description="Default operational status reported by mobile units on the map."
        >
          <ReadOnlyValue label="Default status" value="Police Visibility" />
          <ReadOnlyValue label="Incident alert status" value="On Incident Response" />
        </SettingCard>

        <SettingCard
          title="Access & administration"
          description="Manage who can sign in to the monitoring center and issue mobile tokens."
        >
          <p className="text-xs text-muted">
            Use <strong className="text-foreground">Access Tokens</strong> in the menu
            bar to create or deactivate mobile device tokens.
          </p>
        </SettingCard>
      </div>
    </div>
  );
}
