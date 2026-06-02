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

  return (
    <div className="flex shrink-0 items-center gap-2.5 rounded-xl border border-border/80 bg-background/90 px-2.5 py-2 shadow-sm sm:gap-3 sm:px-3">
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/15 text-xs font-bold text-accent ring-2 ring-accent/20 sm:h-10 sm:w-10 sm:text-sm"
        aria-hidden
      >
        {getInitials(user)}
      </div>

      <div className="hidden min-w-0 max-w-[10rem] md:block lg:max-w-[12rem]">
        <p className="truncate text-sm font-semibold text-foreground">{displayName}</p>
        <p className="truncate text-xs text-muted">{user?.email}</p>
      </div>

      <button
        type="button"
        onClick={onSignOut}
        disabled={signingOut}
        className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-muted transition hover:border-red-500/40 hover:bg-red-500/5 hover:text-red-400 disabled:opacity-50 sm:px-3 sm:text-sm"
      >
        {signingOut ? "..." : "Sign Out"}
      </button>
    </div>
  );
}
