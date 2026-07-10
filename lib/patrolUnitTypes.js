import { countOnDutyPersonnel } from "@/lib/personnelOnBoard";

export const PATROL_UNIT_TYPES = [
  {
    id: "mobile_patrol",
    label: "Mobile Patrol",
    panelLabel: "Mobile Patrol",
    dashboardLabel: "Mobile Patrolling",
    image: "/markers/patrol-car.png",
  },
  {
    id: "motorcycle_patrol",
    label: "Motorcycle Patrol",
    panelLabel: "MC Patrol",
    dashboardLabel: "MC Patrolling",
    image: "/markers/Motocycle.png",
  },
  {
    id: "beat_patrol",
    label: "Beat/Foot Patrol",
    panelLabel: "Beat Patrol",
    dashboardLabel: "Beat Patrolling",
    image: "/markers/beat.png",
  },
  {
    id: "bike_patrol",
    label: "Bike Patrol",
    panelLabel: "Bike Patrol",
    dashboardLabel: "Bike Patrolling",
    image: "/markers/Bike.png",
  },
];

const TYPE_ALIASES = {
  mobile_patrol: "mobile_patrol",
  mobile: "mobile_patrol",
  car: "mobile_patrol",
  motorcycle_patrol: "motorcycle_patrol",
  motorcycle: "motorcycle_patrol",
  motor: "motorcycle_patrol",
  motocycle: "motorcycle_patrol",
  beat_patrol: "beat_patrol",
  beat: "beat_patrol",
  foot: "beat_patrol",
  foot_patrol: "beat_patrol",
  bike_patrol: "bike_patrol",
  bike: "bike_patrol",
  bicycle: "bike_patrol",
};

export function normalizePatrolUnitType(value) {
  const key = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

  if (!key) return "mobile_patrol";
  return TYPE_ALIASES[key] ?? "mobile_patrol";
}

export function getPatrolUnitType(location) {
  return normalizePatrolUnitType(
    location?.patrol_unit_type ?? location?.patrolUnitType
  );
}

export function getPatrolUnitTypeMarkerSrc(locationOrType) {
  const typeId =
    typeof locationOrType === "object"
      ? getPatrolUnitType(locationOrType)
      : normalizePatrolUnitType(locationOrType);
  const match = PATROL_UNIT_TYPES.find((type) => type.id === typeId);
  return match?.image ?? PATROL_UNIT_TYPES[0].image;
}

/** Count active units per patrol type (one row per access_token_id / user_id). */
export function countPatrolUnitsByType(locations) {
  const counts = Object.fromEntries(
    PATROL_UNIT_TYPES.map((type) => [type.id, 0])
  );

  const unitTypes = new Map();

  for (const location of locations ?? []) {
    const unitKey = location?.access_token_id || location?.user_id;
    if (unitKey) {
      if (!unitTypes.has(unitKey)) {
        unitTypes.set(unitKey, getPatrolUnitType(location));
      }
      continue;
    }

    const typeId = getPatrolUnitType(location);
    counts[typeId] += 1;
  }

  for (const typeId of unitTypes.values()) {
    counts[typeId] += 1;
  }

  return counts;
}

/** On-duty personnel per patrol type (one row per access_token_id / user_id). */
export function countPersonnelOnDutyByType(locations) {
  const dutyCounts = Object.fromEntries(
    PATROL_UNIT_TYPES.map((type) => [type.id, 0])
  );

  const unitDuty = new Map();

  for (const location of locations ?? []) {
    const unitKey = location?.access_token_id || location?.user_id;
    const typeId = getPatrolUnitType(location);
    const onDuty = countOnDutyPersonnel(location?.personnel_on_board);

    if (unitKey) {
      if (!unitDuty.has(unitKey)) {
        unitDuty.set(unitKey, { typeId, onDuty });
      }
      continue;
    }

    dutyCounts[typeId] += onDuty;
  }

  for (const { typeId, onDuty } of unitDuty.values()) {
    dutyCounts[typeId] += onDuty;
  }

  return dutyCounts;
}

function createEmptyTypeCounts() {
  return Object.fromEntries(PATROL_UNIT_TYPES.map((type) => [type.id, 0]));
}

function createBreakdownBucket(nameKey, name) {
  return {
    [nameKey]: name,
    unitTypes: new Map(),
    unitDuty: new Map(),
    counts: createEmptyTypeCounts(),
    duty_counts: createEmptyTypeCounts(),
  };
}

function accumulateBreakdown(bucket, location) {
  const unitKey = location?.access_token_id || location?.user_id;
  const typeId = getPatrolUnitType(location);
  const onDuty = countOnDutyPersonnel(location?.personnel_on_board);

  if (unitKey) {
    if (!bucket.unitTypes.has(unitKey)) {
      bucket.unitTypes.set(unitKey, typeId);
    }
    if (!bucket.unitDuty.has(unitKey)) {
      bucket.unitDuty.set(unitKey, { typeId, onDuty });
    }
    return;
  }

  bucket.counts[typeId] += 1;
  bucket.duty_counts[typeId] += onDuty;
}

function finalizeBreakdown(bucket, nameKey) {
  for (const typeId of bucket.unitTypes.values()) {
    bucket.counts[typeId] += 1;
  }
  for (const { typeId, onDuty } of bucket.unitDuty.values()) {
    bucket.duty_counts[typeId] += onDuty;
  }

  return {
    [nameKey]: bucket[nameKey],
    counts: bucket.counts,
    duty_counts: bucket.duty_counts,
  };
}

/** Active units and on-duty personnel per office and station unit, by patrol type. */
export function countPatrolBreakdownByOffice(locations) {
  /** @type {Map<string, ReturnType<typeof createBreakdownBucket> & { units: Map<string, ReturnType<typeof createBreakdownBucket>> }>} */
  const offices = new Map();

  for (const location of locations ?? []) {
    const officeName = String(location?.office ?? "").trim() || "Unassigned";
    const unitName = String(location?.unit ?? "").trim() || "Unassigned";

    if (!offices.has(officeName)) {
      offices.set(officeName, {
        ...createBreakdownBucket("office", officeName),
        units: new Map(),
      });
    }

    const officeBucket = offices.get(officeName);
    if (!officeBucket.units.has(unitName)) {
      officeBucket.units.set(unitName, createBreakdownBucket("unit", unitName));
    }

    accumulateBreakdown(officeBucket, location);
    accumulateBreakdown(officeBucket.units.get(unitName), location);
  }

  return [...offices.values()]
    .map((officeBucket) => ({
      ...finalizeBreakdown(officeBucket, "office"),
      units: [...officeBucket.units.values()]
        .map((unitBucket) => finalizeBreakdown(unitBucket, "unit"))
        .sort((a, b) => a.unit.localeCompare(b.unit)),
    }))
    .sort((a, b) => a.office.localeCompare(b.office));
}
