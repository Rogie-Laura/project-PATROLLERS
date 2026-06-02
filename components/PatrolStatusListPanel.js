"use client";

import {
  getPatrolStatusLabel,
  PATROL_STATUS,
} from "@/lib/patrolStatusLabels";

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

function StatusGroup({ title, color, items, selectedPatrolKey, onSelect }) {
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
                  <p className="truncate text-xs font-medium text-foreground">
                    {patrolLabel(location)}
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
}) {
  const visibility = locations.filter(
    (loc) => loc.patrol_status !== PATROL_STATUS.incidentResponse
  );
  const incident = locations.filter(
    (loc) => loc.patrol_status === PATROL_STATUS.incidentResponse
  );

  return (
    <aside className="flex h-full w-full max-w-[340px] shrink-0 flex-col border-l border-border/60 bg-card/95 backdrop-blur-sm sm:w-[320px]">
      <div className="border-b border-border/60 px-4 py-3">
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted">
          Live overview
        </p>
        <h2 className="text-sm font-semibold text-foreground">Patrol Status</h2>
        <p className="mt-1 text-[11px] text-muted">
          {locations.length} active unit{locations.length === 1 ? "" : "s"} on map
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <StatusGroup
          title={getPatrolStatusLabel(PATROL_STATUS.policeVisibility)}
          color="#22c55e"
          items={visibility}
          selectedPatrolKey={selectedPatrolKey}
          onSelect={onSelectPatrol}
        />
        <StatusGroup
          title={getPatrolStatusLabel(PATROL_STATUS.incidentResponse)}
          color="#ef4444"
          items={incident}
          selectedPatrolKey={selectedPatrolKey}
          onSelect={onSelectPatrol}
        />
      </div>
    </aside>
  );
}
