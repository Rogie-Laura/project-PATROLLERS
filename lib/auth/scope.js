import { COMMAND_ROLES, normalizeRole } from "./roles";

const norm = (value) => String(value ?? "").trim().toLowerCase();

/**
 * Marker visibility scope per command-center role:
 *  - System Administrator / RCC : whole region (all markers)
 *  - PCC (Provincial)           : markers whose office matches the user's office
 *  - SCC (Station)              : markers whose office AND unit match the user's
 *  - Anyone else (Patroller)    : nothing
 */
export function canViewLocation(user, row) {
  const role = normalizeRole(user?.role);

  if (role === COMMAND_ROLES.SYSTEM_ADMIN || role === COMMAND_ROLES.RCC) {
    return true;
  }

  if (role === COMMAND_ROLES.PCC) {
    return norm(row?.office) === norm(user?.office) && norm(user?.office) !== "";
  }

  if (role === COMMAND_ROLES.SCC) {
    return (
      norm(row?.office) === norm(user?.office) &&
      norm(row?.unit) === norm(user?.unit) &&
      norm(user?.office) !== "" &&
      norm(user?.unit) !== ""
    );
  }

  return false;
}

/** True when the role sees every marker regardless of office/unit. */
export function hasRegionWideScope(user) {
  const role = normalizeRole(user?.role);
  return role === COMMAND_ROLES.SYSTEM_ADMIN || role === COMMAND_ROLES.RCC;
}

export function filterLocationsForUser(user, rows) {
  if (!Array.isArray(rows)) return [];
  if (hasRegionWideScope(user)) return rows;
  return rows.filter((row) => canViewLocation(user, row));
}

/**
 * Exact ownership scope (used for call responses / incidents). Unlike the
 * hierarchical marker scope, a row is "owned" only by the command level that
 * created it — its office AND unit must match the viewer exactly:
 *   - RCC / System Administrator (empty office+unit) : only region-level incidents
 *   - PCC (office, no unit)                           : only its own incidents
 *   - SCC (office + unit)                             : only its own station's
 * This keeps each command level's dispatch panel independent.
 */
export function isSameScope(user, row) {
  return (
    norm(user?.office) === norm(row?.office) &&
    norm(user?.unit) === norm(row?.unit)
  );
}

export function filterOwnedForUser(user, rows) {
  if (!Array.isArray(rows)) return [];
  return rows.filter((row) => isSameScope(user, row));
}

/**
 * Incidents that belong to a SUBORDINATE level — visible to a higher office for
 * awareness only (read-only overview), never in their interactive dispatch panel:
 *   - RCC / System Administrator : every incident owned by a PCC or SCC
 *   - PCC                        : every station (SCC) incident in its office
 *   - SCC                        : none
 */
export function isSubordinateScope(user, row) {
  // Never treat the viewer's own incidents as "subordinate".
  if (isSameScope(user, row)) return false;

  const role = normalizeRole(user?.role);
  if (role === COMMAND_ROLES.SYSTEM_ADMIN || role === COMMAND_ROLES.RCC) {
    // Anything tagged to a specific office (PCC/SCC owned).
    return norm(row?.office) !== "";
  }
  if (role === COMMAND_ROLES.PCC) {
    // Stations under this PCC's office (they carry a unit).
    return norm(row?.office) === norm(user?.office) && norm(row?.unit) !== "";
  }
  return false;
}

export function filterSubordinateForUser(user, rows) {
  if (!Array.isArray(rows)) return [];
  return rows.filter((row) => isSubordinateScope(user, row));
}

/** True for roles that oversee subordinate offices (RCC / admin / PCC). */
export function canSeeSubordinates(user) {
  const role = normalizeRole(user?.role);
  return (
    role === COMMAND_ROLES.SYSTEM_ADMIN ||
    role === COMMAND_ROLES.RCC ||
    role === COMMAND_ROLES.PCC
  );
}
