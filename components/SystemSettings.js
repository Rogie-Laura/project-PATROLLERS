"use client";

import { useCallback, useEffect, useState } from "react";
import {
  COMMAND_FEATURE_LABELS,
  COMMAND_LEVELS,
  DEFAULT_COMMAND_FEATURE_FLAGS,
} from "@/lib/auth/commandFeatureFlags";
import TokenConflictMonitor from "@/components/TokenConflictMonitor";
import {
  MAX_INCIDENT_RADIUS_CIRCLES,
  MAX_RADIUS_KM,
  MIN_RADIUS_KM,
  createDefaultRadiusRingSlots,
} from "@/lib/incidentRadiusRings";

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

function DirectionsOption({ selected, title, badge, description, onSelect, disabled }) {
  return (
    <label
      className={`flex cursor-pointer gap-3 rounded-lg border px-3 py-3 transition ${
        selected
          ? "border-accent/50 bg-accent/10"
          : "border-border/50 bg-background/40 hover:border-border hover:bg-background/60"
      } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
    >
      <input
        type="radio"
        name="directions_provider"
        checked={selected}
        disabled={disabled}
        onChange={onSelect}
        className="mt-1 shrink-0 accent-accent"
      />
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-foreground">{title}</span>
          {badge && (
            <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-400">
              {badge}
            </span>
          )}
        </span>
        <span className="mt-1 block text-xs leading-relaxed text-muted">
          {description}
        </span>
      </span>
    </label>
  );
}

function RadiusCircleRow({ index, slot, disabled, onChange }) {
  return (
    <div
      className={`rounded-lg border px-3 py-3 transition ${
        slot.enabled
          ? "border-border/60 bg-background/50"
          : "border-border/40 bg-background/25 opacity-75"
      }`}
    >
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex min-w-[7rem] cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={slot.enabled}
            disabled={disabled}
            onChange={(e) => onChange({ ...slot, enabled: e.target.checked })}
            className="h-4 w-4 shrink-0 accent-accent"
          />
          <span className="text-sm font-medium text-foreground">
            Circle {index + 1}
          </span>
        </label>

        {slot.enabled ? (
          <>
            <div className="flex items-center gap-2">
              <label className="sr-only" htmlFor={`radius-km-${index}`}>
                Distance in kilometers for circle {index + 1}
              </label>
              <input
                id={`radius-km-${index}`}
                type="number"
                min={MIN_RADIUS_KM}
                max={MAX_RADIUS_KM}
                step={0.1}
                disabled={disabled}
                value={slot.radiusKm}
                onChange={(e) =>
                  onChange({ ...slot, radiusKm: Number(e.target.value) })
                }
                className="w-24 rounded-lg border border-border/70 bg-background/80 px-2.5 py-1.5 text-sm text-foreground outline-none focus:border-accent"
              />
              <span className="text-xs text-muted">km</span>
            </div>

            <div className="flex items-center gap-2">
              <label className="sr-only" htmlFor={`radius-color-${index}`}>
                Color for circle {index + 1}
              </label>
              <input
                id={`radius-color-${index}`}
                type="color"
                disabled={disabled}
                value={slot.color}
                onChange={(e) => onChange({ ...slot, color: e.target.value })}
                className="h-9 w-12 cursor-pointer rounded border border-border/70 bg-transparent p-0.5"
              />
              <span
                className="hidden h-7 w-7 shrink-0 rounded-full border-2 border-white/80 sm:inline-block"
                style={{ backgroundColor: slot.color }}
                aria-hidden
              />
            </div>
          </>
        ) : (
          <span className="text-xs text-muted">Enable to set distance and color</span>
        )}
      </div>
    </div>
  );
}

const COST = {
  supaBase: 25, // Supabase Pro platform fee
  rtIncludedMsg: 5_000_000, // realtime messages included
  rtPerMillion: 2.5,
  egressIncludedGB: 250,
  egressPerGB: 0.09,
  vercelBase: 20, // Vercel Pro platform fee
  maintenance: 2.5, // Server maintenance (fixed monthly)
  fxRate: 61, // Fixed PHP per USD
  avgRtKb: 0.8, // assumed realtime payload per change
  safety: 0.2, // 20% safety buffer
};

function independentUsageParams(usageParams) {
  return {
    ...usageParams,
    freeMessageAllowance: COST.rtIncludedMsg,
    egressFreeGB: COST.egressIncludedGB,
  };
}

function EstimatorInput({ label, value, onChange, min = 0, step = 1, suffix }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-muted">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="number"
          min={min}
          step={step}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="min-w-0 flex-1 rounded-lg border border-border/70 bg-background/80 px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
        />
        {suffix && <span className="shrink-0 text-xs text-muted">{suffix}</span>}
      </div>
    </div>
  );
}

function EstimatorRow({ label, value, strong }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className={`text-xs ${strong ? "font-semibold text-foreground" : "text-muted"}`}>
        {label}
      </span>
      <span className={`text-right text-sm ${strong ? "font-semibold text-accent" : "font-medium text-foreground"}`}>
        {value}
      </span>
    </div>
  );
}

function estimateMonthlyCost(
  phonesN,
  { locMinN, hbSecN, hoursN, monitorsN, freeMessageAllowance = 0, egressFreeGB = 0 }
) {
  const activeSec = hoursN * 30 * 3600;
  const locationWrites = phonesN * (activeSec / (locMinN * 60));
  const heartbeats = phonesN * (activeSec / hbSecN);
  const profileUpdates = locationWrites + heartbeats;
  const locationInserts = locationWrites;
  const realtimeMessages = (profileUpdates + locationInserts) * monitorsN;

  const rtOver = Math.max(0, realtimeMessages - freeMessageAllowance);
  const rtCost = (rtOver / 1_000_000) * COST.rtPerMillion;
  const rtEgressGB = (realtimeMessages * COST.avgRtKb) / 1_000_000;
  const egressOver = Math.max(0, rtEgressGB - egressFreeGB);
  const egressCost = egressOver * COST.egressPerGB;

  const subtotal = rtCost + egressCost;
  const buffer = subtotal * COST.safety;
  const total = subtotal + buffer;

  return {
    phonesN,
    locationWrites,
    heartbeats,
    realtimeMessages,
    rtCost,
    egressCost,
    subtotal,
    buffer,
    total,
  };
}

function TierCostPanel({
  title,
  badge,
  phones,
  onPhonesChange,
  estimate,
  platformBase = 0,
  both,
  usd,
  intFmt,
}) {
  const tierTotal = estimate.total + platformBase + COST.maintenance;

  return (
    <div className="rounded-lg border border-border/50 bg-background/40 px-3 py-3">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <span className="rounded-full bg-background/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
          {badge}
        </span>
      </div>

      <EstimatorInput
        label="Mobile phones"
        value={phones}
        onChange={onPhonesChange}
        suffix="units"
      />

      <div className="mt-3">
        {platformBase > 0 && (
          <>
            <EstimatorRow label="Supabase Pro (base $25)" value={usd(COST.supaBase)} />
            <EstimatorRow label="Vercel Pro (base)" value={usd(COST.vercelBase)} />
          </>
        )}
        <EstimatorRow label="Server maintenance (fixed)" value={usd(COST.maintenance)} />
        <EstimatorRow
          label="Realtime messages / month"
          value={intFmt(estimate.realtimeMessages)}
        />
        <EstimatorRow label="Realtime overage" value={usd(estimate.rtCost)} />
        <EstimatorRow label="Egress overage" value={usd(estimate.egressCost)} />
        <div className="my-1 border-t border-border/50" />
        <EstimatorRow label="Usage subtotal" value={both(estimate.subtotal)} />
        <EstimatorRow label="Safety buffer (20%)" value={both(estimate.buffer)} />
        <div className="my-1 border-t border-border/50" />
        <EstimatorRow label="Monthly cost" value={both(tierTotal)} strong />
      </div>
    </div>
  );
}

function CostEstimatorCard() {
  const [regionPhones, setRegionPhones] = useState("0");
  const [stationPhones, setStationPhones] = useState("250");
  const [provincialPhones, setProvincialPhones] = useState("80");
  const [locMin, setLocMin] = useState("3");
  const [hbSec, setHbSec] = useState("60");
  const [hours, setHours] = useState("24");
  const [monitors, setMonitors] = useState("1");
  const [fx, setFx] = useState(String(COST.fxRate));

  const n = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
  const regionPhonesN = Math.max(0, n(regionPhones));
  const stationPhonesN = Math.max(0, n(stationPhones));
  const provincialPhonesN = Math.max(0, n(provincialPhones));
  const locMinN = Math.max(0.5, n(locMin) || 3);
  const hbSecN = Math.max(10, n(hbSec) || 60);
  const hoursN = Math.min(24, Math.max(1, n(hours) || 24));
  const monitorsN = Math.max(1, n(monitors) || 1);
  const rate = Math.max(1, n(fx) || COST.fxRate);

  const usageParams = { locMinN, hbSecN, hoursN, monitorsN };
  const regionParams = independentUsageParams(usageParams);
  const billedUsageParams = {
    ...usageParams,
    freeMessageAllowance: 0,
    egressFreeGB: 0,
  };

  const region = estimateMonthlyCost(regionPhonesN, regionParams);
  const provincial = estimateMonthlyCost(provincialPhonesN, billedUsageParams);
  const station = estimateMonthlyCost(stationPhonesN, billedUsageParams);

  const platformBase = COST.supaBase + COST.vercelBase;

  const usd = (x) => `$${x.toFixed(2)}`;
  const php = (x) => `\u20b1${Math.round(x * rate).toLocaleString("en-US")}`;
  const both = (x) => `${usd(x)}  (${php(x)})`;
  const intFmt = (x) => Math.round(x).toLocaleString("en-US");

  const panelProps = { both, usd, intFmt };

  return (
    <SettingCard
      title="Monthly cost estimator"
      description="Simple calculator — enter phone counts separately for Region (RCC), Station (SCC), or Provincial (PCC). Each panel computes its own monthly cost. No sharing between tiers."
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <EstimatorInput label="Location interval" value={locMin} onChange={setLocMin} step={0.5} suffix="min" />
        <EstimatorInput label="Heartbeat interval" value={hbSec} onChange={setHbSec} step={5} suffix="sec" />
        <EstimatorInput label="Active hours/day" value={hours} onChange={setHours} suffix="h" />
        <EstimatorInput label="Monitors open" value={monitors} onChange={setMonitors} suffix="open" />
        <EstimatorInput label="FX rate" value={fx} onChange={setFx} step={0.5} suffix="₱/$" />
      </div>

      <div className="mt-4 grid gap-3 xl:grid-cols-3">
        <TierCostPanel
          title="Region"
          badge="RCC"
          phones={regionPhones}
          onPhonesChange={setRegionPhones}
          estimate={region}
          platformBase={platformBase}
          {...panelProps}
        />
        <TierCostPanel
          title="Provincial"
          badge="PCC"
          phones={provincialPhones}
          onPhonesChange={setProvincialPhones}
          estimate={provincial}
          {...panelProps}
        />
        <TierCostPanel
          title="Station"
          badge="SCC"
          phones={stationPhones}
          onPhonesChange={setStationPhones}
          estimate={station}
          {...panelProps}
        />
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-muted">
        Each panel is independent — e.g. enter 100 phones for Cavite PCC, or 80 for Laguna, one at
        a time. Region includes platform base (Vercel + Supabase Pro) and the included free tier.
        SCC and PCC bill usage from their own phone count (no free-tier credit). All tiers include
        server maintenance ({usd(COST.maintenance)}/month). Realtime payload assumed ~{COST.avgRtKb} KB/change.
        PHP conversion defaults to {COST.fxRate} ₱/$ and can be edited above.
      </p>
    </SettingCard>
  );
}

const COMMAND_FEATURE_ROWS = [
  { key: "addCallResponse", label: COMMAND_FEATURE_LABELS.addCallResponse },
  { key: "forceLocation", label: COMMAND_FEATURE_LABELS.forceLocation },
  { key: "generateReport", label: COMMAND_FEATURE_LABELS.generateReport },
];

function CommandFeatureToggleGrid({ flags, disabled, onChange }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border/50">
      <table className="min-w-full text-left text-sm">
        <thead>
          <tr className="border-b border-border/50 bg-background/40">
            <th className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted">
              Feature
            </th>
            {COMMAND_LEVELS.map((level) => (
              <th
                key={level}
                className="px-3 py-2 text-center text-xs font-semibold uppercase tracking-wide text-muted"
              >
                {level}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {COMMAND_FEATURE_ROWS.map((row) => (
            <tr key={row.key} className="border-b border-border/40 last:border-b-0">
              <td className="px-3 py-2.5 text-sm text-foreground">{row.label}</td>
              {COMMAND_LEVELS.map((level) => (
                <td key={`${level}-${row.key}`} className="px-3 py-2.5 text-center">
                  <input
                    type="checkbox"
                    checked={Boolean(flags?.[level]?.[row.key])}
                    disabled={disabled}
                    onChange={(e) =>
                      onChange(level, row.key, e.target.checked)
                    }
                    className="h-4 w-4 accent-accent"
                    aria-label={`${row.label} for ${level}`}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function SystemSettings({ fullAccess = false, userRole = "" }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingDirections, setSavingDirections] = useState(false);
  const [savingRadius, setSavingRadius] = useState(false);
  const [savingMobileRelease, setSavingMobileRelease] = useState(false);
  const [savingCommandFeatures, setSavingCommandFeatures] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [intervalSeconds, setIntervalSeconds] = useState(180);
  const [intervalLabel, setIntervalLabel] = useState("");
  const [minSeconds, setMinSeconds] = useState(30);
  const [maxSeconds, setMaxSeconds] = useState(86400);
  const [directionsProvider, setDirectionsProvider] = useState("osrm");
  const [googleMapsConfigured, setGoogleMapsConfigured] = useState(false);
  const [radiusRingSlots, setRadiusRingSlots] = useState(createDefaultRadiusRingSlots);
  const [radiusSummary, setRadiusSummary] = useState("");

  const [mobileLatestVersionCode, setMobileLatestVersionCode] = useState("1");
  const [mobileMinVersionCode, setMobileMinVersionCode] = useState("1");
  const [mobileLatestVersionName, setMobileLatestVersionName] = useState("1.0.0");
  const [mobileApkDownloadUrl, setMobileApkDownloadUrl] = useState("");
  const [mobileUpdateRequired, setMobileUpdateRequired] = useState(false);
  const [mobileReleaseNotes, setMobileReleaseNotes] = useState("");
  const [commandFeatureFlags, setCommandFeatureFlags] = useState(
    DEFAULT_COMMAND_FEATURE_FLAGS
  );

  const [value, setValue] = useState("30");
  const [unit, setUnit] = useState("minutes");

  const applySettings = useCallback((settings) => {
    const seconds = settings.location_interval_seconds ?? 180;
    setIntervalSeconds(seconds);
    setIntervalLabel(settings.interval_label ?? "");
    setMinSeconds(settings.min_seconds ?? 30);
    setMaxSeconds(settings.max_seconds ?? 86400);
    setDirectionsProvider(settings.directions_provider ?? "osrm");
    setGoogleMapsConfigured(Boolean(settings.google_maps_configured));
    if (settings.incident_radius_rings) {
      setRadiusRingSlots(settings.incident_radius_rings);
    }
    setRadiusSummary(settings.incident_radius_summary ?? "");
    setMobileLatestVersionCode(
      String(settings.mobile_latest_version_code ?? 1)
    );
    setMobileMinVersionCode(String(settings.mobile_min_version_code ?? 1));
    setMobileLatestVersionName(settings.mobile_latest_version_name ?? "1.0.0");
    setMobileApkDownloadUrl(settings.mobile_apk_download_url ?? "");
    setMobileUpdateRequired(Boolean(settings.mobile_update_required));
    setMobileReleaseNotes(settings.mobile_release_notes ?? "");
    if (settings.command_feature_flags) {
      setCommandFeatureFlags(settings.command_feature_flags);
    }

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

  async function handleSaveDirections(event) {
    event.preventDefault();
    setSavingDirections(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/admin/system-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ directions_provider: directionsProvider }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Could not save routing settings.");
      }

      applySettings(data.settings);
      setSuccess("Routing provider saved. New dispatch routes will use this engine.");
    } catch (err) {
      setError(err.message ?? "Could not save routing settings.");
    } finally {
      setSavingDirections(false);
    }
  }

  async function handleSaveRadius(event) {
    event.preventDefault();
    setSavingRadius(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/admin/system-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ incident_radius_rings: radiusRingSlots }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Could not save radius circles.");
      }

      applySettings(data.settings);
      setSuccess(
        "Response radius circles saved. New call responses on the map will use these rings."
      );
    } catch (err) {
      setError(err.message ?? "Could not save radius circles.");
    } finally {
      setSavingRadius(false);
    }
  }

  async function handleSaveMobileRelease(event) {
    event.preventDefault();
    setSavingMobileRelease(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/admin/system-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mobile_latest_version_code: Number(mobileLatestVersionCode),
          mobile_min_version_code: Number(mobileMinVersionCode),
          mobile_latest_version_name: mobileLatestVersionName.trim(),
          mobile_apk_download_url: mobileApkDownloadUrl.trim(),
          mobile_update_required: mobileUpdateRequired,
          mobile_release_notes: mobileReleaseNotes.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Could not save mobile release settings.");
      }

      applySettings(data.settings);
      setSuccess(
        "Mobile release saved. Patrol phones will see an update prompt when their installed version is lower than the latest version code."
      );
    } catch (err) {
      setError(err.message ?? "Could not save mobile release settings.");
    } finally {
      setSavingMobileRelease(false);
    }
  }

  async function handleSaveCommandFeatures(event) {
    event.preventDefault();
    setSavingCommandFeatures(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/admin/system-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command_feature_flags: commandFeatureFlags }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? "Could not save command feature settings.");
      }

      applySettings(data.settings);
      setSuccess(
        "Command center feature access saved. RCC, PCC, and SCC accounts will see the updated toolbar buttons on their next map load."
      );
    } catch (err) {
      setError(err.message ?? "Could not save command feature settings.");
    } finally {
      setSavingCommandFeatures(false);
    }
  }

  function updateCommandFeatureFlag(level, key, enabled) {
    setCommandFeatureFlags((prev) => ({
      ...prev,
      [level]: {
        ...prev[level],
        [key]: enabled,
      },
    }));
  }

  function updateRadiusSlot(index, nextSlot) {
    setRadiusRingSlots((prev) =>
      prev.map((slot, i) => (i === index ? nextSlot : slot))
    );
  }

  const directionsLabel =
    directionsProvider === "google"
      ? "Google Directions API"
      : "OSRM (OpenStreetMap)";

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
      <div className="mx-auto max-w-4xl space-y-4">
        <div>
          <h1 className="text-lg font-semibold text-foreground">
            {fullAccess ? "System Settings" : "Response radius settings"}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {fullAccess
              ? "Configure map response rings, patrol GPS intervals, and dispatch routing."
              : "Configure call response radius circles shown around each incident on the map."}
          </p>
          {!fullAccess && userRole && (
            <p className="mt-2 text-xs text-muted">
              Other system settings are managed by a system administrator.
            </p>
          )}
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
          title="Call response radius circles"
          description="Up to five distance rings around each incident marker on the map. Enable a circle, set its radius in kilometers, and pick a color. The largest enabled ring also sets how far dispatch searches for nearby units."
        >
          <ReadOnlyValue
            label="Active rings"
            value={loading ? "Loading..." : radiusSummary || "—"}
          />

          <form onSubmit={handleSaveRadius} className="mt-4 space-y-2">
            {radiusRingSlots.map((slot, index) => (
              <RadiusCircleRow
                key={`radius-slot-${index}`}
                index={index}
                slot={slot}
                disabled={loading || savingRadius}
                onChange={(next) => updateRadiusSlot(index, next)}
              />
            ))}

            <p className="pt-1 text-[11px] text-muted">
              Distances: {MIN_RADIUS_KM}–{MAX_RADIUS_KM} km per circle. Each enabled
              circle must use a different distance. Maximum {MAX_INCIDENT_RADIUS_CIRCLES}{" "}
              circles.
            </p>

            <button
              type="submit"
              disabled={loading || savingRadius}
              className="mt-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-background transition hover:bg-accent-dark disabled:opacity-50"
            >
              {savingRadius ? "Saving..." : "Save radius circles"}
            </button>
          </form>
        </SettingCard>

        {fullAccess && (
          <>
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
          title="Dispatch directions"
          description="Choose which routing engine powers driving ETA and turn-by-turn routes in call response dispatch."
        >
          <ReadOnlyValue
            label="Current provider"
            value={loading ? "Loading..." : directionsLabel}
          />

          <form onSubmit={handleSaveDirections} className="mt-4 space-y-3">
            <fieldset className="space-y-2" disabled={loading || savingDirections}>
              <legend className="sr-only">Directions provider</legend>

              <DirectionsOption
                selected={directionsProvider === "osrm"}
                title="OSRM"
                description="Standard routing using OpenStreetMap road data. Free, no API key required, and works immediately. ETA is based on road distance and speed limits — no live traffic layer."
                onSelect={() => setDirectionsProvider("osrm")}
              />

              <DirectionsOption
                selected={directionsProvider === "google"}
                title="Google Directions API"
                badge="Advanced"
                description="Traffic-aware routing with turn-by-turn directions and live delay estimates (similar to Google Maps). Requires GOOGLE_MAPS_API_KEY in Vercel with server-side access — do not use HTTP referrer restrictions on this key (use API restriction to Directions API only, or IP addresses). Falls back to OSRM if Google is temporarily unavailable."
                disabled={!googleMapsConfigured}
                onSelect={() => setDirectionsProvider("google")}
              />
            </fieldset>

            {!googleMapsConfigured && (
              <p className="text-[11px] leading-relaxed text-amber-400/90">
                Google Directions is disabled until GOOGLE_MAPS_API_KEY is set in
                Vercel environment variables.
              </p>
            )}

            <button
              type="submit"
              disabled={loading || savingDirections}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-background transition hover:bg-accent-dark disabled:opacity-50"
            >
              {savingDirections ? "Saving..." : "Save routing provider"}
            </button>
          </form>
        </SettingCard>

        <SettingCard
          title="Mobile app update (OTA)"
          description="After you build a new Android APK, upload it to HTTPS storage (Google Drive file link or Supabase Storage) and publish the version here. Phones show an Update button and install in place — same app ID, higher version code."
        >
          <form onSubmit={handleSaveMobileRelease} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted">
                  Latest version code
                </label>
                <input
                  type="number"
                  min={1}
                  required
                  disabled={loading || savingMobileRelease}
                  value={mobileLatestVersionCode}
                  onChange={(e) => setMobileLatestVersionCode(e.target.value)}
                  className="w-full rounded-lg border border-border/70 bg-background/80 px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
                />
                <p className="mt-1 text-[11px] text-muted">
                  Must match <code className="text-foreground">version: x.y.z+CODE</code> in Flutter pubspec.
                </p>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-muted">
                  Minimum required version code
                </label>
                <input
                  type="number"
                  min={1}
                  required
                  disabled={loading || savingMobileRelease}
                  value={mobileMinVersionCode}
                  onChange={(e) => setMobileMinVersionCode(e.target.value)}
                  className="w-full rounded-lg border border-border/70 bg-background/80 px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
                />
                <p className="mt-1 text-[11px] text-muted">
                  Phones below this code must update before continuing.
                </p>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-muted">
                Latest version name
              </label>
              <input
                type="text"
                required
                disabled={loading || savingMobileRelease}
                value={mobileLatestVersionName}
                onChange={(e) => setMobileLatestVersionName(e.target.value)}
                placeholder="1.1.0"
                className="w-full rounded-lg border border-border/70 bg-background/80 px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-muted">
                APK download URL (HTTPS)
              </label>
              <input
                type="url"
                required
                disabled={loading || savingMobileRelease}
                value={mobileApkDownloadUrl}
                onChange={(e) => setMobileApkDownloadUrl(e.target.value)}
                placeholder="https://drive.google.com/file/d/…/view?usp=sharing"
                className="w-full rounded-lg border border-border/70 bg-background/80 px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
              />
              <p className="mt-1 text-[11px] text-muted">
                Google Drive: upload the APK, open the <strong className="font-medium text-foreground">file</strong> (not the folder), Share → Anyone with the link, paste that link — we convert it to a direct download URL automatically. After saving, open{" "}
                <a
                  href="/install"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-accent underline-offset-2 hover:underline"
                >
                  /install
                </a>{" "}
                for the QR code officers can scan.
              </p>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-muted">
                Release notes (optional)
              </label>
              <textarea
                rows={3}
                disabled={loading || savingMobileRelease}
                value={mobileReleaseNotes}
                onChange={(e) => setMobileReleaseNotes(e.target.value)}
                placeholder="Instant dispatch, heartbeat, bug fixes..."
                className="w-full rounded-lg border border-border/70 bg-background/80 px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
              />
            </div>

            <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-border/50 bg-background/40 px-3 py-2.5">
              <input
                type="checkbox"
                checked={mobileUpdateRequired}
                disabled={loading || savingMobileRelease}
                onChange={(e) => setMobileUpdateRequired(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-accent"
              />
              <span className="text-xs leading-relaxed text-muted">
                <strong className="text-foreground">Force update</strong> — block the app until
                patrol installs the latest APK (when an update is available).
              </span>
            </label>

            <button
              type="submit"
              disabled={loading || savingMobileRelease}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-background transition hover:bg-accent-dark disabled:opacity-50"
            >
              {savingMobileRelease ? "Saving..." : "Save mobile release"}
            </button>
          </form>

          <p className="mt-3 text-[11px] leading-relaxed text-muted">
            Rollout steps: (1) bump <code className="text-foreground">version: x.y.z+CODE</code> in
            Flutter, (2) build signed release APK, (3) upload to HTTPS, (4) save settings here.
            First APK with this feature must be installed manually once; later updates are one-tap.
          </p>
        </SettingCard>

        <SettingCard
          title="Command center features"
          description="Turn map toolbar actions on or off for RCC, PCC, and SCC. The system administrator always has Add Call Response, Force Location, and Generate Reports — these toggles do not apply to your account."
        >
          <form onSubmit={handleSaveCommandFeatures} className="space-y-3">
            <CommandFeatureToggleGrid
              flags={commandFeatureFlags}
              disabled={loading || savingCommandFeatures}
              onChange={updateCommandFeatureFlag}
            />
            <p className="text-[11px] leading-relaxed text-muted">
              Changes apply immediately on the server. RCC, PCC, and SCC accounts may need to
              refresh the map to see updated toolbar buttons. Force Location for field accounts
              remains limited to RCC when enabled here.
            </p>
            <button
              type="submit"
              disabled={loading || savingCommandFeatures}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-background transition hover:bg-accent-dark disabled:opacity-50"
            >
              {savingCommandFeatures ? "Saving..." : "Save feature access"}
            </button>
          </form>
        </SettingCard>

        <SettingCard
          title="Patrol status"
          description="Default operational status reported by mobile units on the map."
        >
          <ReadOnlyValue label="Default status" value="Police Visibility" />
          <ReadOnlyValue label="Incident alert status" value="On Incident Response" />
        </SettingCard>

        <CostEstimatorCard />

        <SettingCard
          title="Token conflict monitor"
          description="Detect access tokens where two or more GPS sources compete on the map (likely two phones scanned the same QR). Review flagged units, inspect Wi-Fi vs mobile data clusters, then deactivate or release device binding as needed."
        >
          <TokenConflictMonitor />
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
          </>
        )}
      </div>
    </div>
  );
}
