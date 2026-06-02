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
      return { rankName, mobileNumber };
    })
    .filter(Boolean);
}
