import { countOnDutyPersonnel } from "@/lib/personnelOnBoard";

export const PATROL_UNIT_TYPES = [
  {
    id: "mobile_patrol",
    label: "Mobile Patrol",
    dashboardLabel: "Mobile Patrolling",
    image: "/markers/patrol-car.png",
  },
  {
    id: "motorcycle_patrol",
    label: "Motorcycle Patrol",
    dashboardLabel: "MC Patrolling",
    image: "/markers/Motocycle.png",
  },
  {
    id: "beat_patrol",
    label: "Beat/Foot Patrol",
    dashboardLabel: "Beat Patrolling",
    image: "/markers/beat.png",
  },
  {
    id: "bike_patrol",
    label: "Bike Patrol",
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
