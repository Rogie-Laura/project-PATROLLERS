export function normalizePersonnelOnBoard(value) {
  if (!Array.isArray(value)) return [];

  return value
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const rankName = String(entry.rank_name ?? entry.rankName ?? "").trim();
      const mobileNumber = String(
        entry.mobile_number ?? entry.mobileNumber ?? ""
      ).trim();
      if (!rankName && !mobileNumber) return null;
      return {
        rankName,
        mobileNumber,
        viberNumber: String(
          entry.viber_number ?? entry.viberNumber ?? ""
        ).trim(),
        onDuty: entry.on_duty === true || entry.onDuty === true,
      };
    })
    .filter(Boolean);
}

/** Personnel marked on duty in a unit's on-board list. */
export function countOnDutyPersonnel(personnelOnBoard) {
  return normalizePersonnelOnBoard(personnelOnBoard).filter(
    (person) => person.onDuty
  ).length;
}
