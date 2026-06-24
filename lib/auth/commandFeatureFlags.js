import {
  canDispatch,
  canForceLocation,
  COMMAND_ROLES,
  isCommandCenterRole,
  isSystemAdministrator,
  normalizeRole,
} from "@/lib/auth/roles";

export const COMMAND_LEVELS = [
  COMMAND_ROLES.RCC,
  COMMAND_ROLES.PCC,
  COMMAND_ROLES.SCC,
];

export const COMMAND_FEATURE_KEYS = {
  addCallResponse: "addCallResponse",
  forceLocation: "forceLocation",
  generateReport: "generateReport",
};

export const COMMAND_FEATURE_LABELS = {
  addCallResponse: "Add Call Response",
  forceLocation: "Force Location",
  generateReport: "Generate Reports",
};

/** Default mirrors current production behaviour before admin toggles exist. */
export const DEFAULT_COMMAND_FEATURE_FLAGS = {
  [COMMAND_ROLES.RCC]: {
    addCallResponse: true,
    forceLocation: true,
    generateReport: true,
  },
  [COMMAND_ROLES.PCC]: {
    addCallResponse: true,
    forceLocation: false,
    generateReport: true,
  },
  [COMMAND_ROLES.SCC]: {
    addCallResponse: true,
    forceLocation: false,
    generateReport: true,
  },
};

function readLevelFlag(levelFlags, key) {
  if (!levelFlags || typeof levelFlags !== "object") return undefined;
  return levelFlags[key];
}

/**
 * Merge stored flags with defaults. Unknown levels/keys fall back to defaults.
 */
export function normalizeCommandFeatureFlags(raw) {
  const merged = {};

  for (const level of COMMAND_LEVELS) {
    const defaults = DEFAULT_COMMAND_FEATURE_FLAGS[level];
    const stored = raw?.[level];

    merged[level] = {
      addCallResponse:
        readLevelFlag(stored, "addCallResponse") ?? defaults.addCallResponse,
      forceLocation:
        readLevelFlag(stored, "forceLocation") ?? defaults.forceLocation,
      generateReport:
        readLevelFlag(stored, "generateReport") ?? defaults.generateReport,
    };
  }

  return merged;
}

function flagLevelForRole(normalizedRole) {
  if (isSystemAdministrator(normalizedRole)) {
    return COMMAND_ROLES.RCC;
  }
  return normalizedRole;
}

function isFeatureEnabled(flags, level, key) {
  const normalized = normalizeCommandFeatureFlags(flags);
  const levelFlags = normalized[level];
  if (!levelFlags) return false;
  return levelFlags[key] === true;
}

/**
 * Returns whether [role] may use [featureKey] given admin-configured toggles.
 * Role eligibility (canDispatch, canForceLocation, etc.) is still enforced.
 */
export function canUseCommandFeature(role, featureKey, flags) {
  const normalized = normalizeRole(role);
  if (!normalized) return false;

  if (featureKey === COMMAND_FEATURE_KEYS.addCallResponse) {
    if (!canDispatch(normalized)) return false;
    return isFeatureEnabled(flags, normalized, "addCallResponse");
  }

  if (featureKey === COMMAND_FEATURE_KEYS.forceLocation) {
    if (!canForceLocation(normalized)) return false;
    return isFeatureEnabled(flags, flagLevelForRole(normalized), "forceLocation");
  }

  if (featureKey === COMMAND_FEATURE_KEYS.generateReport) {
    if (!isCommandCenterRole(normalized)) return false;
    return isFeatureEnabled(flags, flagLevelForRole(normalized), "generateReport");
  }

  return false;
}

export function parseCommandFeatureFlagsInput(raw) {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) {
    return { error: "command_feature_flags must be an object." };
  }

  const next = {};

  for (const level of COMMAND_LEVELS) {
    const source = raw[level];
    if (source == null || typeof source !== "object" || Array.isArray(source)) {
      return { error: `Invalid flags for ${level}.` };
    }

    next[level] = {
      addCallResponse: Boolean(source.addCallResponse),
      forceLocation: Boolean(source.forceLocation),
      generateReport: Boolean(source.generateReport),
    };
  }

  return { flags: normalizeCommandFeatureFlags(next) };
}
