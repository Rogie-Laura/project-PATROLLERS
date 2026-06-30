import { getUnitKey, getUnitLabel } from "@/lib/dispatchUnits";
import { normalizePersonnelOnBoard } from "@/lib/personnelOnBoard";

function normalizeText(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function normalizePlate(value) {
  return normalizeText(value).replace(/[\s-]/g, "");
}

function getDeployedPersonnel(location) {
  return normalizePersonnelOnBoard(location?.personnel_on_board).filter(
    (person) => person.onDuty
  );
}

function buildSearchDocument(location) {
  const office = normalizeText(location?.office);
  const unit = normalizeText(location?.unit);
  const plate = normalizePlate(location?.mobile_plate);
  const patrolName = normalizeText(location?.patrol_name);
  const radio = normalizeText(location?.radio_call_sign);
  const personnel = getDeployedPersonnel(location).map((person) =>
    normalizeText(person.rankName)
  );

  return {
    office,
    unit,
    plate,
    patrolName,
    radio,
    personnel,
    combined: [office, unit, patrolName, radio, ...personnel]
      .filter(Boolean)
      .join(" "),
  };
}

function scorePatrolMatch(location, query) {
  const q = normalizeText(query);
  if (q.length < 2) return 0;

  const qPlate = normalizePlate(query);
  const tokens = q.split(" ").filter(Boolean);
  const doc = buildSearchDocument(location);

  if (
    qPlate.length >= 2 &&
    doc.plate &&
    (doc.plate.includes(qPlate) || qPlate.includes(doc.plate))
  ) {
    return doc.plate === qPlate ? 100 : 95;
  }

  if (doc.unit && doc.unit === q) return 92;
  if (doc.office && doc.office === q) return 90;
  if (doc.patrolName && doc.patrolName.includes(q)) return 86;
  if (doc.radio && doc.radio.includes(q)) return 84;

  for (const name of doc.personnel) {
    if (name === q) return 88;
    if (name.includes(q)) return 82;
  }

  if (doc.unit && doc.unit.includes(q)) return 80;
  if (doc.office && doc.office.includes(q)) return 78;
  if (doc.combined.includes(q)) return 74;

  if (tokens.length > 1) {
    const officeTokenHits = tokens.filter((token) => doc.office.includes(token));
    const unitTokenHits = tokens.filter((token) => doc.unit.includes(token));
    const allMatched = tokens.every((token) => doc.combined.includes(token));

    if (allMatched) {
      if (officeTokenHits.length >= 1 && unitTokenHits.length >= 1) return 85;
      return 72;
    }
  }

  if (tokens.length === 1) {
    const token = tokens[0];
    const fields = [
      doc.office,
      doc.unit,
      doc.patrolName,
      doc.radio,
      ...doc.personnel,
    ];
    if (fields.some((field) => field.startsWith(token))) return 60;
  }

  return 0;
}

export function formatPatrolSearchResult(location) {
  const label = getUnitLabel(location);
  const office = String(location?.office ?? "").trim();
  const unit = String(location?.unit ?? "").trim();
  const plate = String(location?.mobile_plate ?? "").trim();
  const deployed = getDeployedPersonnel(location)
    .map((person) => person.rankName)
    .filter(Boolean);

  const metaParts = [];
  if (office && unit) metaParts.push(`${office} · ${unit}`);
  else if (office) metaParts.push(office);
  else if (unit) metaParts.push(unit);
  if (plate) metaParts.push(plate);
  if (deployed.length > 0) metaParts.push(deployed.join(", "));

  return {
    key: getUnitKey(location),
    label,
    meta: metaParts.join(" · "),
    location,
  };
}

/** Search patrol units by office, unit, plate, call sign, or deployed personnel name. */
export function searchPatrolLocations(locations, query, limit = 12) {
  const list = Array.isArray(locations) ? locations : [];
  const q = String(query ?? "").trim();
  if (q.length < 2) return [];

  return list
    .map((location) => ({
      location,
      score: scorePatrolMatch(location, q),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return formatPatrolSearchResult(a.location).label.localeCompare(
        formatPatrolSearchResult(b.location).label
      );
    })
    .slice(0, limit)
    .map((entry) => formatPatrolSearchResult(entry.location));
}
