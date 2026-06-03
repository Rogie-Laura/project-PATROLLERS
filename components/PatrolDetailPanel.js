"use client";

import { normalizePersonnelOnBoard } from "@/lib/personnelOnBoard";
import { getPatrolStatusLabel } from "@/lib/patrolStatusLabels";
import {
  CONNECTION_BORDER_COLOR,
  CONNECTION_LABEL,
  CONNECTION_STATE,
  getConnectionState,
  staleThresholdMs,
} from "@/lib/connectionState";

function signalText(location, connectionState) {
  if (connectionState === CONNECTION_STATE.stale) return "No signal (stale)";
  const level = String(location.signal_level ?? "").toLowerCase();
  if (level === "weak") return "Weak";
  if (level === "strong") return "Strong";
  return location.signal_label || "—";
}

function DetailRow({ label, value }) {
  return (
    <div className="flex justify-between gap-3 text-xs">
      <span className="shrink-0 text-muted">{label}</span>
      <span className="text-right font-medium text-foreground">{value || "—"}</span>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section className="border-b border-border/60 px-4 py-3 last:border-b-0">
      <h3 className="mb-2.5 text-[11px] font-semibold uppercase tracking-wide text-accent">
        {title}
      </h3>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

export default function PatrolDetailPanel({
  location,
  showPatrolStatus = true,
  nowMs = Date.now(),
  intervalSeconds = 1800,
  onClose,
}) {
  if (!location) return null;

  const connectionState = getConnectionState(
    location,
    nowMs,
    staleThresholdMs(intervalSeconds)
  );
  const connectionColor =
    CONNECTION_BORDER_COLOR[connectionState] || CONNECTION_BORDER_COLOR.strong;
  const connectionLabel =
    CONNECTION_LABEL[connectionState] || CONNECTION_LABEL.strong;

  const personnel = normalizePersonnelOnBoard(location.personnel_on_board);
  const title =
    location.patrol_name ||
    location.mobile_plate ||
    location.radio_call_sign ||
    "Mobile Unit";

  const accuracy =
    location.accuracy != null && !Number.isNaN(Number(location.accuracy))
      ? `${Number(location.accuracy).toFixed(0)} m`
      : "—";

  const lastUpdate = location.created_at
    ? new Date(location.created_at).toLocaleString()
    : "—";

  return (
    <aside className="flex h-full w-full max-w-[340px] shrink-0 flex-col border-l border-border/60 bg-card/95 backdrop-blur-sm sm:w-[320px]">
      <div className="flex items-start justify-between gap-2 border-b border-border/60 px-4 py-3">
        <div className="min-w-0">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted">
            Selected unit
          </p>
          <h2 className="truncate text-sm font-semibold text-foreground">{title}</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close panel"
          className="shrink-0 rounded-md p-1 text-muted transition hover:bg-background/80 hover:text-foreground"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="h-4 w-4"
            aria-hidden
          >
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <Section title="Vehicle Info">
          <DetailRow label="Mobile Plate" value={location.mobile_plate} />
          <DetailRow label="Radio Call Sign" value={location.radio_call_sign} />
          <DetailRow label="Office" value={location.office} />
          <DetailRow label="Unit" value={location.unit} />
          {showPatrolStatus && (
            <DetailRow
              label="Patrol Status"
              value={getPatrolStatusLabel(location.patrol_status)}
            />
          )}
          <DetailRow label="Last Update" value={lastUpdate} />
          <DetailRow label="GPS Accuracy" value={accuracy} />
        </Section>

        <Section title="Deployed Personnel">
          {personnel.length === 0 ? (
            <p className="text-xs text-muted">No personnel on board.</p>
          ) : (
            <ul className="space-y-2">
              {personnel.map((person, index) => (
                <li
                  key={`${person.rankName}-${person.mobileNumber}-${index}`}
                  className="rounded-md border border-border/50 bg-background/40 px-2.5 py-2"
                >
                  <p className="text-xs font-medium text-foreground">
                    {person.rankName || "Unnamed"}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted">
                    {person.mobileNumber || "No mobile number"}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Connection">
          <div className="flex items-center justify-between gap-3 text-xs">
            <span className="shrink-0 text-muted">Live status</span>
            <span className="flex items-center gap-1.5 font-medium text-foreground">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: connectionColor }}
                aria-hidden
              />
              {connectionLabel}
            </span>
          </div>
          <DetailRow
            label="Signal Strength"
            value={signalText(location, connectionState)}
          />
        </Section>

        <Section title="Phone Status">
          <DetailRow label="Mobile Phone" value={location.mobile_phone} />
          <DetailRow
            label="Battery"
            value={location.battery_level != null ? `${location.battery_level}%` : "—"}
          />
          <DetailRow label="Network" value={location.signal_label || "—"} />
          {(location.battery_level == null && !location.signal_label) && (
            <p className="text-[10px] leading-snug text-muted">
              Battery and signal appear here when the mobile app reports them with
              location updates.
            </p>
          )}
        </Section>
      </div>
    </aside>
  );
}
