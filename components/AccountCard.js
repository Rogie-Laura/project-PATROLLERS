"use client";

import { useState } from "react";
import ConfirmDialog from "@/components/ConfirmDialog";

function getInitials(user) {
  const name = user?.full_name || user?.email || "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export default function AccountCard({ user, onSignOut, signingOut }) {
  const displayName = user?.rank_fullname || user?.full_name || user?.email || "User";
  const subtitle =
    user?.accessMode === "token"
      ? [user?.unit, user?.office].filter(Boolean).join(" · ") || "Token access"
      : user?.email;
  const [confirmOpen, setConfirmOpen] = useState(false);

  function handleSignOutClick() {
    setConfirmOpen(true);
  }

  function handleCancelSignOut() {
    if (signingOut) return;
    setConfirmOpen(false);
  }

  function handleConfirmSignOut() {
    setConfirmOpen(false);
    onSignOut();
  }

  return (
    <>
      <ConfirmDialog
        open={confirmOpen}
        title="Sign out?"
        description={
          user?.accessMode === "token"
            ? "You will leave Smart Locator and need your access token again to continue."
            : "You will leave the monitoring center and need to sign in again to continue."
        }
        confirmLabel="Sign Out"
        cancelLabel="Cancel"
        confirmVariant="destructive"
        confirming={signingOut}
        onConfirm={handleConfirmSignOut}
        onCancel={handleCancelSignOut}
      />

      <div className="flex shrink-0 items-center gap-2 rounded-lg border border-border/80 bg-background/90 px-2 py-1 shadow-sm sm:gap-2.5 sm:px-2.5">
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/15 text-[11px] font-bold text-accent ring-1 ring-accent/20"
          aria-hidden
        >
          {getInitials(user)}
        </div>

        <div className="hidden min-w-0 max-w-[9rem] lg:block lg:max-w-[11rem]">
          <p className="truncate text-xs font-semibold text-foreground">{displayName}</p>
          <p className="truncate text-[10px] text-muted">{subtitle}</p>
        </div>

        <button
          type="button"
          onClick={handleSignOutClick}
          disabled={signingOut}
          className="rounded-md border border-border px-2 py-1 text-[11px] font-medium text-muted transition hover:border-red-500/40 hover:bg-red-500/5 hover:text-red-400 disabled:opacity-50 sm:text-xs"
        >
          {signingOut ? "..." : "Sign Out"}
        </button>
      </div>
    </>
  );
}
