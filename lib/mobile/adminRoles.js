export {
  canAccessSettings,
  canEditFullSettings,
  canEditRadiusSettings,
  canManageAccessTokens,
  canManageUsers,
  isAdminRole,
  isCommandCenterRole,
  isMonitoringRole,
  isSystemAdministrator,
  normalizeRole,
  roleLabel,
} from "@/lib/auth/roles";

export function formatTokenUser(profile) {
  if (!profile) return "Not registered yet";

  const parts = [
    profile.mobile_plate,
    profile.radio_call_sign,
    profile.unit,
    profile.office,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(" · ") : "Not registered yet";
}
