"use client";

import {
  CONNECTION_BORDER_COLOR,
  CONNECTION_LABEL,
  CONNECTION_STATE,
} from "@/lib/connectionState";
import {
  getPatrolMarkerColor,
  getPatrolStatusLabel,
  PATROL_STATUS,
} from "@/lib/patrolStatusLabels";

function LegendRow({ swatch, label, description }) {
  return (
    <li className="flex items-start gap-2">
      <span className="mt-0.5 shrink-0" aria-hidden>
        {swatch}
      </span>
      <span className="min-w-0">
        <span className="block text-[11px] font-medium text-foreground">{label}</span>
        {description ? (
          <span className="block text-[10px] leading-snug text-muted">{description}</span>
        ) : null}
      </span>
    </li>
  );
}

function MarkerSwatch({ fill, border }) {
  return (
    <span
      className="inline-block h-3.5 w-3.5 rounded-full border-2"
      style={{ backgroundColor: fill, borderColor: border }}
    />
  );
}

export default function MapLegendOverlay() {
  return (
    <div className="pointer-events-auto max-w-[220px] rounded-lg border border-border/60 bg-card/95 px-3 py-2.5 shadow-lg backdrop-blur-sm">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted">
        Legend
      </p>
      <ul className="space-y-2">
        <LegendRow
          swatch={
            <MarkerSwatch
              fill={getPatrolMarkerColor(PATROL_STATUS.policeVisibility)}
              border={CONNECTION_BORDER_COLOR[CONNECTION_STATE.strong]}
            />
          }
          label={getPatrolStatusLabel(PATROL_STATUS.policeVisibility)}
          description="Marker fill when on patrol"
        />
        <LegendRow
          swatch={
            <MarkerSwatch
              fill={getPatrolMarkerColor(PATROL_STATUS.incidentResponse)}
              border={CONNECTION_BORDER_COLOR[CONNECTION_STATE.strong]}
            />
          }
          label={getPatrolStatusLabel(PATROL_STATUS.incidentResponse)}
          description="Marker fill during incident response"
        />
        <LegendRow
          swatch={
            <span
              className="inline-block h-3.5 w-3.5 rounded-full border-[3px] bg-muted/30"
              style={{ borderColor: CONNECTION_BORDER_COLOR[CONNECTION_STATE.strong] }}
            />
          }
          label={CONNECTION_LABEL[CONNECTION_STATE.strong]}
          description="Border — live, strong signal"
        />
        <LegendRow
          swatch={
            <span
              className="inline-block h-3.5 w-3.5 rounded-full border-[3px] bg-muted/30"
              style={{ borderColor: CONNECTION_BORDER_COLOR[CONNECTION_STATE.weak] }}
            />
          }
          label={CONNECTION_LABEL[CONNECTION_STATE.weak]}
          description="Border — live, weak signal"
        />
        <LegendRow
          swatch={
            <span
              className="inline-block h-3.5 w-3.5 rounded-full border-[3px] bg-muted/30"
              style={{ borderColor: CONNECTION_BORDER_COLOR[CONNECTION_STATE.stale] }}
            />
          }
          label={CONNECTION_LABEL[CONNECTION_STATE.stale]}
          description="Border — no recent update"
        />
      </ul>
    </div>
  );
}
