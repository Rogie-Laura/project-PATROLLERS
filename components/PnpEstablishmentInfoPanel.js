"use client";

import { useState } from "react";
import ConfirmDialog from "@/components/ConfirmDialog";

export default function PnpEstablishmentInfoPanel({
  establishment,
  canManage = false,
  onClose,
  onEdit,
  onRemove,
}) {
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [removing, setRemoving] = useState(false);

  if (!establishment) return null;

  return (
    <>
      <aside className="pointer-events-auto absolute bottom-3 right-3 top-3 z-[1100] flex w-[min(100%-1.5rem,20rem)] flex-col overflow-hidden rounded-xl border border-border/70 bg-card/95 shadow-xl backdrop-blur-sm sm:bottom-3">
        <div className="flex items-start justify-between gap-2 border-b border-border/60 px-4 py-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">
              PNP Establishment
            </p>
            <h2 className="truncate text-sm font-semibold text-foreground">
              {establishment.type}
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
          {establishment.iconUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={establishment.iconUrl}
              alt=""
              className="mx-auto h-14 w-14 object-contain"
            />
          ) : null}

          <InfoRow label="Type" value={establishment.type} />
          <InfoRow label="Unit" value={establishment.unit || "—"} />
          <InfoRow label="Office" value={establishment.office || "—"} />
          <InfoRow label="Station TOC" value={establishment.stationToc || "—"} />
          <InfoRow
            label="Lat"
            value={
              Number.isFinite(establishment.latitude)
                ? establishment.latitude.toFixed(6)
                : "—"
            }
          />
          <InfoRow
            label="Long"
            value={
              Number.isFinite(establishment.longitude)
                ? establishment.longitude.toFixed(6)
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
        title="Remove establishment?"
        description={`Remove ${establishment.type}${
          establishment.stationToc ? ` — ${establishment.stationToc}` : ""
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
