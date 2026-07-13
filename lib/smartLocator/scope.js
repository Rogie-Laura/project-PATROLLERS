import { canViewLocation, isSameScope } from "@/lib/auth/scope";
import { isCommandCenterRole, isSystemAdministrator } from "@/lib/auth/roles";

export function canAccessSmartLocator(user) {
  if (!user) return false;
  if (user.accessMode === "token") {
    return Boolean(user.office || user.unit || isSystemAdministrator(user.role));
  }
  return isCommandCenterRole(user?.role);
}

export function filterPointsForUser(user, rows) {
  if (!Array.isArray(rows)) return [];
  return rows.filter((row) => canViewLocation(user, row));
}

export function canManagePoint(user, row) {
  return isSameScope(user, row);
}

export function scopeFromUser(user) {
  return {
    office: String(user?.office ?? "").trim(),
    unit: String(user?.unit ?? "").trim(),
  };
}
