export const DEFAULT_CONFLICT_LOOKBACK_DAYS = 7;
export const DEFAULT_MIN_CONFLICT_MINUTES = 5;

export function classifyTokenConflict(row) {
  const conflictMinutes = Number(row?.conflict_minutes) || 0;
  const jumpPct = Number(row?.jump_pct) || 0;

  if (conflictMinutes >= 20 || jumpPct >= 50) return "critical";
  if (conflictMinutes >= 10 || jumpPct >= 25) return "warning";
  return "watch";
}

export function enrichConflictRow(row) {
  if (!row || typeof row !== "object") return null;

  return {
    ...row,
    severity: classifyTokenConflict(row),
  };
}

export function parseConflictReport(data, options = {}) {
  const lookbackDays = options.lookbackDays ?? DEFAULT_CONFLICT_LOOKBACK_DAYS;
  const minConflictMinutes =
    options.minConflictMinutes ?? DEFAULT_MIN_CONFLICT_MINUTES;

  const rows = Array.isArray(data) ? data : [];
  const conflicts = rows
    .map(enrichConflictRow)
    .filter(Boolean)
    .sort((a, b) => {
      const severityRank = { critical: 0, warning: 1, watch: 2 };
      const bySeverity =
        (severityRank[a.severity] ?? 9) - (severityRank[b.severity] ?? 9);
      if (bySeverity !== 0) return bySeverity;
      return (b.conflict_minutes ?? 0) - (a.conflict_minutes ?? 0);
    });

  return {
    lookback_days: lookbackDays,
    min_conflict_minutes: minConflictMinutes,
    conflict_count: conflicts.length,
    critical_count: conflicts.filter((row) => row.severity === "critical").length,
    conflicts,
    scanned_at: new Date().toISOString(),
  };
}

export function severityLabel(severity) {
  switch (severity) {
    case "critical":
      return "Critical";
    case "warning":
      return "Warning";
    default:
      return "Watch";
  }
}

export function severityBadgeClass(severity) {
  switch (severity) {
    case "critical":
      return "bg-red-500/15 text-red-400";
    case "warning":
      return "bg-amber-500/15 text-amber-400";
    default:
      return "bg-sky-500/15 text-sky-400";
  }
}
