"use client";

const PRIORITY_STYLES = {
  high: "bg-red-500/20 text-red-300 border-red-500/40",
  medium: "bg-amber-500/15 text-amber-200 border-amber-500/35",
  low: "bg-slate-500/15 text-slate-300 border-slate-500/40",
};

export default function IncidentCordonPanel({
  incidentLabel,
  cordonPlan,
  loading,
  error,
  highlightedId,
  onHighlight,
  onClearIncident,
  onRetry,
}) {
  const checkpoints = cordonPlan?.checkpoints ?? [];
  const escapeRoutes = cordonPlan?.escapeRoutes ?? [];

  return (
    <aside className="flex h-full w-full max-w-[360px] flex-col border-r border-border/60 bg-card/95 backdrop-blur-sm">
      <div className="border-b border-border/60 px-4 py-3">
        <p className="text-[10px] font-medium uppercase tracking-wide text-red-400">
          Public safety — cordon assist
        </p>
        <h2 className="text-sm font-semibold text-foreground">
          Suggested block &amp; escape points
        </h2>
        <p className="mt-1 text-[10px] leading-snug text-muted">
          After you place an incident, this lists intersections to consider for
          a dragnet and roads that may be escape routes (from map data).
        </p>
        {incidentLabel && (
          <p className="mt-1 line-clamp-2 text-[11px] text-foreground/80">
            {incidentLabel}
          </p>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        <p className="mb-3 rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-1.5 text-[10px] leading-relaxed text-amber-100/90">
          Decision support only — verify on the ground with field units before
          blocking roads. Data from OpenStreetMap (not a second deployment).
        </p>

        {loading && (
          <div className="flex items-center gap-2 py-6 text-sm text-muted">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-accent border-t-transparent" />
            Analyzing roads and intersections…
          </div>
        )}

        {error && (
          <div className="space-y-2">
            <p className="text-sm text-red-400">{error}</p>
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="rounded-md border border-accent/50 bg-accent/10 px-3 py-1.5 text-xs font-medium text-accent transition hover:bg-accent/20"
              >
                Retry analysis
              </button>
            )}
          </div>
        )}

        {!loading && !error && cordonPlan?.summary && (
          <>
            <p className="mb-3 text-[11px] leading-relaxed text-foreground/90">
              {cordonPlan.summary}
            </p>
            {cordonPlan.partial && (
              <p className="mb-3 text-[10px] text-amber-200/90">
                Loaded intersections only; escape routes skipped this time due to
                slow map data.
              </p>
            )}
          </>
        )}

        {!loading && checkpoints.length > 0 && (
          <section className="mb-4">
            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-accent">
              Cordon / choke points ({checkpoints.length})
            </h3>
            <ul className="space-y-1.5">
              {checkpoints.map((point, index) => {
                const isActive = highlightedId === point.id;

                return (
                  <li key={point.id}>
                    <button
                      type="button"
                      onClick={() => onHighlight?.(isActive ? null : point.id)}
                      className={`w-full rounded-lg border px-2.5 py-2 text-left transition ${
                        isActive
                          ? "border-accent bg-accent/10"
                          : "border-border/60 bg-background/40 hover:border-accent/40"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-[11px] font-medium text-foreground">
                          {index + 1}. {point.label}
                        </span>
                        <span
                          className={`shrink-0 rounded border px-1 py-0.5 text-[9px] font-semibold uppercase ${
                            PRIORITY_STYLES[point.priority] ||
                            PRIORITY_STYLES.medium
                          }`}
                        >
                          {point.priority}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[10px] text-muted">
                        {point.zone} ring · {point.distanceLabel}
                      </p>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {!loading && escapeRoutes.length > 0 && (
          <section>
            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-orange-400">
              Possible escape corridors ({escapeRoutes.length})
            </h3>
            <ul className="space-y-1.5">
              {escapeRoutes.map((route, index) => (
                <li
                  key={route.id}
                  className="rounded-lg border border-orange-500/25 bg-orange-500/5 px-2.5 py-2"
                >
                  <p className="text-[11px] font-medium text-foreground">
                    {index + 1}. {route.name}
                  </p>
                  <p className="mt-0.5 text-[10px] capitalize text-muted">
                    {route.highway?.replace(/_/g, " ")} · outward{" "}
                    {Math.round(route.minDistanceMeters / 100) / 10}–
                    {Math.round(route.maxDistanceMeters / 100) / 10} km from
                    incident
                  </p>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      <div className="border-t border-border/60 p-3">
        <button
          type="button"
          onClick={onClearIncident}
          className="w-full rounded-md border border-border/70 bg-background/60 px-3 py-2 text-xs font-medium text-muted transition hover:border-red-500/50 hover:text-red-300"
        >
          Clear incident from map
        </button>
      </div>
    </aside>
  );
}
