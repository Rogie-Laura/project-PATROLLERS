"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  confirmVariant = "default",
  confirming = false,
  onConfirm,
  onCancel,
}) {
  const dialogRef = useRef(null);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      if (event.key !== "Tab" || !dialogRef.current) return;

      const focusable = dialogRef.current.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown, true);

    const focusTimer = window.setTimeout(() => {
      const cancelButton = dialogRef.current?.querySelector("[data-confirm-cancel]");
      cancelButton?.focus();
    }, 0);

    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", handleKeyDown, true);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open) return null;

  const confirmClassName =
    confirmVariant === "destructive"
      ? "rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
      : "rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-background transition hover:bg-accent-dark disabled:opacity-50";

  return createPortal(
    <div
      className="fixed inset-0 z-[2500] flex touch-none items-center justify-center bg-black/60 p-4"
      aria-hidden={false}
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
        className="pointer-events-auto w-full max-w-md touch-auto rounded-xl border border-border/70 bg-card shadow-xl"
        onClick={(event) => event.stopPropagation()}
        onMouseDown={(event) => event.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-description"
      >
        <div className="border-b border-border/60 px-5 py-4">
          <h2 id="confirm-dialog-title" className="text-base font-semibold text-foreground">
            {title}
          </h2>
          {description && (
            <p id="confirm-dialog-description" className="mt-2 text-sm leading-relaxed text-muted">
              {description}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 px-5 py-3">
          <button
            type="button"
            data-confirm-cancel
            disabled={confirming}
            onClick={onCancel}
            className="rounded-lg border border-border/70 px-4 py-2 text-sm font-medium text-muted transition hover:bg-background/80 hover:text-foreground disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={confirming}
            onClick={onConfirm}
            className={confirmClassName}
          >
            {confirming ? "..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
