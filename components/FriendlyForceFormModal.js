"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import ConfirmDialog from "@/components/ConfirmDialog";

export default function FriendlyForceFormModal({
  open,
  mode = "add",
  draft,
  saving = false,
  error = "",
  onChange,
  onCancel,
  onRequestSave,
}) {
  const dialogRef = useRef(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    if (!open) {
      setConfirmOpen(false);
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
      }
    }

    document.addEventListener("keydown", handleKeyDown, true);
    const focusTimer = window.setTimeout(() => {
      dialogRef.current?.querySelector("input:not([readonly]), textarea")?.focus();
    }, 0);

    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", handleKeyDown, true);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open || !draft) return null;

  const canSave =
    String(draft.commandingOfficer ?? "").trim() &&
    String(draft.contactNumber ?? "").trim() &&
    String(draft.addressLocation ?? "").trim();

  const title = mode === "edit" ? "Edit Friendly Force" : "Add Friendly Force";
  const confirmTitle =
    mode === "edit" ? "Save changes?" : "Save Friendly Force?";
  const confirmDescription =
    mode === "edit"
      ? `Update ${draft.typeLabel} — ${draft.commandingOfficer || "this unit"}?`
      : `Add ${draft.typeLabel} for ${draft.unit || "this unit"} at the selected location?`;

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-[2000] flex touch-none items-center justify-center bg-black/50 p-4"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
        onMouseDown={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
        role="presentation"
      >
        <div
          ref={dialogRef}
          className="pointer-events-auto max-h-[90vh] w-full max-w-md touch-auto overflow-y-auto rounded-xl border border-border/70 bg-card shadow-xl"
          onClick={(event) => event.stopPropagation()}
          onMouseDown={(event) => event.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="friendly-force-form-title"
        >
          <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-border/60 bg-card px-5 py-4">
            <div>
              <h2
                id="friendly-force-form-title"
                className="text-base font-semibold text-foreground"
              >
                {title}
              </h2>
              <p className="mt-1 text-xs text-muted">Friendly Units</p>
            </div>
            <button
              type="button"
              aria-label="Close"
              disabled={saving}
              onClick={onCancel}
              className="rounded-md px-2 py-1 text-lg leading-none text-muted transition hover:bg-background/80 hover:text-foreground disabled:opacity-50"
            >
              ×
            </button>
          </div>

          <form
            className="space-y-3 px-5 py-4"
            onSubmit={(event) => {
              event.preventDefault();
              setConfirmOpen(true);
            }}
          >
            <label className="block text-xs font-medium text-muted">
              Type
              <input
                readOnly
                value={draft.typeLabel ?? ""}
                className="mt-1 w-full rounded-lg border border-border/70 bg-background/50 px-3 py-2 text-sm text-foreground"
              />
            </label>

            <label className="block text-xs font-medium text-muted">
              Unit
              <input
                readOnly
                value={draft.unit ?? ""}
                className="mt-1 w-full rounded-lg border border-border/70 bg-background/50 px-3 py-2 text-sm text-foreground"
              />
            </label>

            <label className="block text-xs font-medium text-muted">
              Office
              <input
                readOnly
                value={draft.office ?? ""}
                className="mt-1 w-full rounded-lg border border-border/70 bg-background/50 px-3 py-2 text-sm text-foreground"
              />
            </label>

            <label className="block text-xs font-medium text-muted">
              Name of Commanding Officer/Chief/Team Leader{" "}
              <span className="text-accent">*</span>
              <input
                value={draft.commandingOfficer ?? ""}
                onChange={(event) =>
                  onChange({ commandingOfficer: event.target.value })
                }
                placeholder="Enter name"
                className="mt-1 w-full rounded-lg border border-border/70 bg-background/80 px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
              />
            </label>

            <label className="block text-xs font-medium text-muted">
              Contact Number <span className="text-accent">*</span>
              <input
                value={draft.contactNumber ?? ""}
                onChange={(event) =>
                  onChange({ contactNumber: event.target.value })
                }
                placeholder="Enter contact number"
                className="mt-1 w-full rounded-lg border border-border/70 bg-background/80 px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
              />
            </label>

            <label className="block text-xs font-medium text-muted">
              Address/Location <span className="text-accent">*</span>
              <textarea
                value={draft.addressLocation ?? ""}
                onChange={(event) =>
                  onChange({ addressLocation: event.target.value })
                }
                rows={2}
                placeholder="Enter address or location"
                className="mt-1 w-full rounded-lg border border-border/70 bg-background/80 px-3 py-2 text-sm text-foreground outline-none focus:border-accent"
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block text-xs font-medium text-muted">
                Lat
                <input
                  readOnly
                  value={
                    Number.isFinite(draft.latitude)
                      ? Number(draft.latitude).toFixed(6)
                      : ""
                  }
                  className="mt-1 w-full rounded-lg border border-border/70 bg-background/50 px-3 py-2 text-sm text-foreground"
                />
              </label>
              <label className="block text-xs font-medium text-muted">
                Long
                <input
                  readOnly
                  value={
                    Number.isFinite(draft.longitude)
                      ? Number(draft.longitude).toFixed(6)
                      : ""
                  }
                  className="mt-1 w-full rounded-lg border border-border/70 bg-background/50 px-3 py-2 text-sm text-foreground"
                />
              </label>
            </div>

            {error ? (
              <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
                {error}
              </p>
            ) : null}

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={onCancel}
                disabled={saving}
                className="rounded-lg border border-border/70 px-4 py-2 text-sm text-muted transition hover:bg-background/80 hover:text-foreground disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || !canSave}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-background transition hover:bg-accent-dark disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </form>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title={confirmTitle}
        description={confirmDescription}
        confirmLabel={mode === "edit" ? "Save changes" : "Save friendly force"}
        cancelLabel="Back"
        confirming={saving}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={async () => {
          const ok = await onRequestSave();
          if (ok) setConfirmOpen(false);
        }}
      />
    </>,
    document.body
  );
}
