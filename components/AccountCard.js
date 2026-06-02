function getInitials(user) {
  const name = user?.full_name || user?.email || "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function InfoRow({ label, value }) {
  if (!value) return null;

  return (
    <div className="flex items-start justify-between gap-3 text-sm">
      <span className="shrink-0 text-muted">{label}</span>
      <span className="text-right font-medium text-foreground">{value}</span>
    </div>
  );
}

export default function AccountCard({ user, onSignOut, signingOut }) {
  const displayName = user?.rank_fullname || user?.full_name || user?.email || "User";

  return (
    <section className="rounded-xl border border-border bg-background p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent/15 text-sm font-bold text-accent ring-2 ring-accent/20">
          {getInitials(user)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-foreground">{displayName}</p>
          <p className="truncate text-xs text-muted">{user?.email}</p>
        </div>
      </div>

      <div className="mt-4 space-y-2 border-t border-border/60 pt-4">
        <InfoRow label="Role" value={user?.role} />
        <InfoRow label="Unit" value={user?.unit} />
        <InfoRow label="Office" value={user?.office} />
        <InfoRow label="Badge" value={user?.badge_number} />
      </div>

      <button
        type="button"
        onClick={onSignOut}
        disabled={signingOut}
        className="mt-4 w-full rounded-lg border border-border py-2.5 text-sm font-medium text-muted transition hover:border-red-500/40 hover:bg-red-500/5 hover:text-red-400 disabled:opacity-50"
      >
        {signingOut ? "Signing out..." : "Sign Out"}
      </button>
    </section>
  );
}
