"use client";

import {
  getPatrolStatusLabel,
  PATROL_STATUS,
} from "@/lib/patrolStatusLabels";
import {
  CONNECTION_BORDER_COLOR,
  CONNECTION_LABEL,
  getConnectionState,
  staleThresholdMs,
} from "@/lib/connectionState";

function patrolLabel(location) {
  return (
    location.patrol_name ||
    location.mobile_plate ||
    location.radio_call_sign ||
    location.unit ||
    "Mobile Unit"
  );
}

function patrolKey(location) {
  return location.access_token_id || location.user_id || location.id;
}

function DetachPanelIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3.5 w-3.5 shrink-0"
      aria-hidden
    >
      <path d="M15 3h6v6" />
      <path d="M10 14 21 3" />
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    </svg>
  );
}

function StatusGroup({
  title,
  color,
  items,
  selectedPatrolKey,
  onSelect,
  nowMs,
  staleMs,
}) {
  return (
    <section className="border-b border-border/60 px-4 py-3 last:border-b-0">
      <div className="mb-2 flex items-center gap-2">
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: color }}
          aria-hidden
        />
        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-foreground">
          {title}
        </h3>
        <span className="ml-auto rounded-full bg-background/80 px-1.5 py-0.5 text-[10px] font-medium text-muted">
          {items.length}
        </span>
      </div>

      {items.length === 0 ? (
        <p className="text-xs text-muted">No units in this status.</p>
      ) : (
        <ul className="space-y-1">
          {items.map((location) => {
            const key = patrolKey(location);
            const selected = key != null && key === selectedPatrolKey;
            const connectionState = getConnectionState(location, nowMs, staleMs);
            const connectionColor =
              CONNECTION_BORDER_COLOR[connectionState] ||
              CONNECTION_BORDER_COLOR.strong;

            return (
              <li key={key ?? location.id}>
                <button
                  type="button"
                  onClick={() => onSelect?.(location)}
                  className={`w-full rounded-md border px-2.5 py-2 text-left transition ${
                    selected
                      ? "border-accent/50 bg-accent/10"
                      : "border-border/50 bg-background/40 hover:border-border hover:bg-background/70"
                  }`}
                >
                  <p className="flex items-center gap-1.5 truncate text-xs font-medium text-foreground">
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: connectionColor }}
                      title={CONNECTION_LABEL[connectionState]}
                      aria-hidden
                    />
                    <span className="truncate">{patrolLabel(location)}</span>
                  </p>
                  {location.mobile_plate && location.patrol_name && (
                    <p className="mt-0.5 truncate text-[10px] text-muted">
                      {location.mobile_plate}
                    </p>
                  )}
                  <p className="mt-0.5 text-[10px] text-muted">
                    {location.created_at
                      ? new Date(location.created_at).toLocaleString()
                      : "—"}
                  </p>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export default function PatrolStatusListPanel({
  locations,
  selectedPatrolKey,
  onSelectPatrol,
  nowMs = Date.now(),
  intervalSeconds = 180,
  showHeader = true,
  embedded = false,
  onDetach,
  detachBlocked = false,
}) {
  const staleMs = staleThresholdMs(intervalSeconds);
  const visibility = locations.filter(
    (loc) => loc.patrol_status !== PATROL_STATUS.incidentResponse
  );
  const incident = locations.filter(
    (loc) => loc.patrol_status === PATROL_STATUS.incidentResponse
  );

  return (
    <aside
      className={`flex h-full w-full flex-col bg-card ${
        embedded ? "" : "border-l border-border/60"
      }`}
    >
      {showHeader && (
        <div className="border-b border-border/60 px-4 py-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted">
                Live overview
              </p>
              <h2 className="text-sm font-semibold text-foreground">Patrol Status</h2>
              <p className="mt-1 text-[11px] text-muted">
                {locations.length} active unit{locations.length === 1 ? "" : "s"} on map
              </p>
            </div>
            {onDetach && (
              <button
                type="button"
                onClick={onDetach}
                title={
                  detachBlocked
                    ? "Allow pop-ups for this site to use a separate window from the detached panel"
                    : "Detach to a movable panel (lock/unlock and Dock in the panel title bar)"
                }
                className={`flex shrink-0 items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-medium transition ${
                  detachBlocked
                    ? "border-amber-500/50 text-amber-400 hover:bg-amber-500/10"
                    : "border-border/60 text-muted hover:bg-background/80 hover:text-foreground"
                }`}
              >
                <DetachPanelIcon />
                <span className="whitespace-nowrap">Detach</span>
              </button>
            )}
          </div>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto">
        <StatusGroup
          title={getPatrolStatusLabel(PATROL_STATUS.policeVisibility)}
          color="#22c55e"
          items={visibility}
          selectedPatrolKey={selectedPatrolKey}
          onSelect={onSelectPatrol}
          nowMs={nowMs}
          staleMs={staleMs}
        />
        <StatusGroup
          title={getPatrolStatusLabel(PATROL_STATUS.incidentResponse)}
          color="#ef4444"
          items={incident}
          selectedPatrolKey={selectedPatrolKey}
          onSelect={onSelectPatrol}
          nowMs={nowMs}
          staleMs={staleMs}
        />
      </div>
    </aside>
  );
}
