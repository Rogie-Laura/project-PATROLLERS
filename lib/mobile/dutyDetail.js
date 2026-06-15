const MAX_VISIBILITY_POINTS = 5;
const MAX_DUTY_SHIFTS = 12;

function normalizeTime(value, fallback) {
  const raw = String(value ?? "").trim();
  const match = raw.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return fallback;
  const hour = Math.min(23, Math.max(0, Number(match[1])));
  const minute = Math.min(59, Math.max(0, Number(match[2])));
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function normalizeDutyShifts(value) {
  if (!Array.isArray(value)) return [];

  return value
    .slice(0, MAX_DUTY_SHIFTS)
    .map((entry, index) => {
      const label = String(entry?.label ?? "").trim() || `${index + 1}${ordinalSuffix(index + 1)} Shift`;
      const startTime = normalizeTime(
        entry?.start_time ?? entry?.startTime,
        index === 1 ? "20:00" : "08:00"
      );
      const endTime = normalizeTime(
        entry?.end_time ?? entry?.endTime,
        index === 1 ? "08:00" : "20:00"
      );
      return { label, start_time: startTime, end_time: endTime };
    })
    .filter((entry) => entry.start_time && entry.end_time);
}

export function normalizeVisibilityPoints(value) {
  if (!Array.isArray(value)) return [];

  return value
    .slice(0, MAX_VISIBILITY_POINTS)
    .map((entry) => ({
      name: String(entry?.name ?? "").trim(),
    }))
    .filter((entry) => entry.name);
}

function ordinalSuffix(n) {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return "th";
  switch (n % 10) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
}

export function formatShiftRange(shift) {
  if (!shift) return "—";
  const start = formatTime12(shift.start_time ?? shift.startTime);
  const end = formatTime12(shift.end_time ?? shift.endTime);
  return `${start} – ${end}`;
}

export function formatTime12(value) {
  const normalized = normalizeTime(value, "");
  if (!normalized) return "—";
  const [hourRaw, minuteRaw] = normalized.split(":");
  let hour = Number(hourRaw);
  const minute = minuteRaw;
  const period = hour >= 12 ? "PM" : "AM";
  hour = hour % 12;
  if (hour === 0) hour = 12;
  return `${hour}:${minute} ${period}`;
}
