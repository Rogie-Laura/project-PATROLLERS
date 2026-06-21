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
