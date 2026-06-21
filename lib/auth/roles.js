export const COMMAND_ROLES = {
  SYSTEM_ADMIN: "System Administrator",
  RCC: "RCC",
  PCC: "PCC",
  SCC: "SCC",
  PATROLLER: "Patroller",
};

/** Legacy DB values mapped to current command-center roles. */
const LEGACY_ROLE_MAP = {
  phq: COMMAND_ROLES.PCC,
  stn: COMMAND_ROLES.SCC,
};

export function normalizeRole(role) {
  if (!role) return role;
  return LEGACY_ROLE_MAP[role] ?? role;
}

export function isSystemAdministrator(role) {
  return normalizeRole(role) === COMMAND_ROLES.SYSTEM_ADMIN;
}

export function isCommandCenterRole(role) {
  const normalized = normalizeRole(role);
  return (
    normalized === COMMAND_ROLES.RCC ||
    normalized === COMMAND_ROLES.PCC ||
    normalized === COMMAND_ROLES.SCC ||
    isSystemAdministrator(normalized)
  );
}

/** System Settings is now System Administrator only (tokens + settings). */
export function canAccessSettings(role) {
  return isSystemAdministrator(role);
}

export function canEditRadiusSettings(role) {
  return canAccessSettings(role);
}

export function canEditFullSettings(role) {
  return isSystemAdministrator(role);
}

export function canManageAccessTokens(role) {
  return isSystemAdministrator(role);
}

/** Only System Administrator can create/manage monitoring accounts. */
export function canManageUsers(role) {
  return isSystemAdministrator(role);
}

/** Roles a System Administrator can assign to monitoring accounts. */
export const MONITORING_ROLES = [
  COMMAND_ROLES.RCC,
  COMMAND_ROLES.PCC,
  COMMAND_ROLES.SCC,
];

export function isMonitoringRole(role) {
  return MONITORING_ROLES.includes(normalizeRole(role));
}

/** System Administrator only — full admin menu (tokens, all settings). */
export function isAdminRole(role) {
  return canManageAccessTokens(role);
}

export function roleLabel(role) {
  const normalized = normalizeRole(role);
  switch (normalized) {
    case COMMAND_ROLES.RCC:
      return "Regional Command Center";
    case COMMAND_ROLES.PCC:
      return "Provincial Command Center";
    case COMMAND_ROLES.SCC:
      return "Station Command Center";
    case COMMAND_ROLES.SYSTEM_ADMIN:
      return "System Administrator";
    default:
      return normalized ?? "User";
  }
}
