"use client";

import { useState } from "react";
import ConfirmDialog from "@/components/ConfirmDialog";

export default function EducationalInstitutionInfoPanel({
  marker,
  canManage = false,
  onClose,
  onEdit,
  onRemove,
}) {
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [removing, setRemoving] = useState(false);

  if (!marker) return null;

  const personnel = Array.isArray(marker.personnel) ? marker.personnel : [];

  return (
    <>
      <aside className="pointer-events-auto absolute bottom-3 right-3 top-3 z-[1100] flex w-[min(100%-1.5rem,20rem)] flex-col overflow-hidden rounded-xl border border-border/70 bg-card/95 shadow-xl backdrop-blur-sm">
        <div className="flex items-start justify-between gap-2 border-b border-border/60 px-4 py-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
              Educational Institutions
            </p>
            <h2 className="truncate text-sm font-semibold text-foreground">
              {marker.type}
            </h2>
          </div>
          <button
            type="button"
            aria-label="Close panel"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-lg leading-none text-muted transition hover:bg-background/80 hover:text-foreground"
          >
            ×
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3 text-sm">
          {marker.iconUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={marker.iconUrl}
              alt=""
              className="mx-auto h-14 w-14 object-contain"
            />
          ) : null}
          <InfoRow label="Type" value={marker.type} />
          <InfoRow label="Unit" value={marker.unit || "—"} />
          <InfoRow label="Office" value={marker.office || "—"} />
          <InfoRow
            label="Principal/School Supervisor"
            value={marker.principalSupervisor || "—"}
          />
          <InfoRow label="Contact Number" value={marker.contactNumber || "—"} />
          <InfoRow
            label="Address/Location"
            value={marker.addressLocation || "—"}
          />
          <InfoRow
            label="Estimated Number of Students"
            value={marker.estimatedStudents || "—"}
          />
          <InfoRow
            label="Established as Polling Center"
            value={marker.isPollingCenter ? "Yes" : "No"}
          />

          {marker.isPollingCenter ? (
            <>
              <div className="border-t border-border/50 pt-2">
                <p className="text-center text-[10px] font-semibold uppercase tracking-wide text-muted">
                  ---Election Data---
                </p>
              </div>
              <InfoRow
                label="Number of Voters"
                value={marker.numberOfVoters || "—"}
              />
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
                  Deployed Personnel
                </p>
                {personnel.length === 0 ? (
                  <p className="mt-0.5 text-foreground">—</p>
                ) : (
                  <ul className="mt-1 space-y-2">
                    {personnel.map((row, index) => (
                      <li
                        key={`${row.rankName}-${row.contactNumber}-${index}`}
                        className="rounded-lg border border-border/40 bg-background/40 px-2.5 py-2"
                      >
                        <p className="break-words font-medium text-foreground">
                          {row.rankName || "—"}
                        </p>
                        <p className="mt-0.5 break-words text-xs text-muted">
                          {row.contactNumber || "—"}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          ) : null}

          <InfoRow
            label="Lat"
            value={
              Number.isFinite(marker.latitude) ? marker.latitude.toFixed(6) : "—"
            }
          />
          <InfoRow
            label="Long"
            value={
              Number.isFinite(marker.longitude)
                ? marker.longitude.toFixed(6)
                : "—"
            }
          />
        </div>

        {canManage ? (
          <div className="flex gap-2 border-t border-border/60 px-4 py-3">
            <button
              type="button"
              onClick={onEdit}
              className="flex-1 rounded-lg border border-border/70 px-3 py-2 text-sm font-medium text-foreground transition hover:bg-background/80"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => setConfirmRemove(true)}
              className="flex-1 rounded-lg border border-red-500/40 px-3 py-2 text-sm font-medium text-red-400 transition hover:bg-red-500/10"
            >
              Remove
            </button>
          </div>
        ) : null}
      </aside>

      <ConfirmDialog
        open={confirmRemove}
        title="Remove Educational Institution marker?"
        description={`Remove ${marker.type}${
          marker.addressLocation ? ` — ${marker.addressLocation}` : ""
        } from the map? This cannot be undone.`}
        confirmLabel="Remove"
        cancelLabel="Cancel"
        confirmVariant="destructive"
        confirming={removing}
        onCancel={() => setConfirmRemove(false)}
        onConfirm={async () => {
          setRemoving(true);
          try {
            await onRemove();
            setConfirmRemove(false);
          } finally {
            setRemoving(false);
          }
        }}
      />
    </>
  );
}

function InfoRow({ label, value }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
        {label}
      </p>
      <p className="mt-0.5 break-words text-foreground">{value}</p>
    </div>
  );
}
