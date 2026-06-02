export const ADMIN_ROLES = new Set(["phq", "RCC", "System Administrator"]);

export function isAdminRole(role) {
  return ADMIN_ROLES.has(role);
}

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
