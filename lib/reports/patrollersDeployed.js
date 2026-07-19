import { normalizePersonnelOnBoard } from "@/lib/personnelOnBoard";
import {
  formatShiftRange,
  normalizeDutyShifts,
  normalizeVisibilityPoints,
} from "@/lib/mobile/dutyDetail";

export const PATROLLERS_DEPLOYED_REPORT_ID = "patrollers_deployed";

export const REPORT_TYPES = [
  {
    id: PATROLLERS_DEPLOYED_REPORT_ID,
    label: "Patrollers Deployed",
    description: "Active units currently live on the map.",
  },
];

/** Preferred office order when report filter is All. */
export const PREFERRED_OFFICE_ORDER = [
  "Cavite PPO",
  "Laguna PPO",
  "Batangas PPO",
  "Rizal PPO",
  "Quezon PPO",
];

function officeSortRank(office) {
  const normalized = String(office ?? "").trim();
  const index = PREFERRED_OFFICE_ORDER.findIndex(
    (name) => name.toLowerCase() === normalized.toLowerCase()
  );
  return index >= 0 ? index : PREFERRED_OFFICE_ORDER.length;
}

export function compareOffices(a, b) {
  const rankA = officeSortRank(a);
  const rankB = officeSortRank(b);
  if (rankA !== rankB) return rankA - rankB;
  return String(a ?? "").localeCompare(String(b ?? ""), undefined, {
    sensitivity: "base",
  });
}

export function sortOffices(offices = []) {
  return [...offices].sort(compareOffices);
}

function text(value) {
  const next = String(value ?? "").trim();
  return next || "—";
}

export function formatVisibilityPointsCell(raw) {
  const points = normalizeVisibilityPoints(raw);
  if (points.length === 0) return "—";
  return points.map((point) => point.name).join("; ");
}

export function formatDesignatedPatrolMembers(raw) {
  const onDuty = normalizePersonnelOnBoard(raw).filter((person) => person.onDuty);
  if (onDuty.length === 0) return "—";
  return onDuty
    .map((person) => {
      if (person.rankName && person.mobileNumber) {
        return `${person.rankName} (${person.mobileNumber})`;
      }
      return person.rankName || person.mobileNumber;
    })
    .join("; ");
}

export function formatShiftingCell(raw) {
  const shifts = normalizeDutyShifts(raw);
  if (shifts.length === 0) return "—";

  return shifts
    .map((shift, index) => {
      const defaultLabel =
        index === 0 ? "1st Shift" : index === 1 ? "2nd Shift" : shift.label;
      const label = String(shift.label ?? "").trim() || defaultLabel;
      const selectedMark = shift.selected ? " (active)" : "";
      return `${label}: ${formatShiftRange(shift)}${selectedMark}`;
    })
    .join(" | ");
}

export function buildPatrollersDeployedRows(locations = []) {
  // One row per active unit, then collapse duplicate plates.
  const byUnitKey = new Map();
  for (const loc of locations) {
    if (!loc) continue;
    const unitKey =
      loc.access_token_id ||
      loc.user_id ||
      `plate:${normalizePlateKey(loc.mobile_plate)}|${String(loc.office ?? "").trim()}|${String(loc.unit ?? "").trim()}`;
    if (!unitKey || unitKey === "plate:|") continue;

    const existing = byUnitKey.get(unitKey);
    if (!existing || locationFreshness(loc) >= locationFreshness(existing)) {
      byUnitKey.set(unitKey, loc);
    }
  }

  const byPlate = new Map();
  for (const loc of byUnitKey.values()) {
    const plateKey = normalizePlateKey(loc.mobile_plate);
    const dedupeKey =
      plateKey ||
      loc.access_token_id ||
      loc.user_id ||
      `${String(loc.office ?? "").trim()}|${String(loc.unit ?? "").trim()}|${String(loc.radio_call_sign ?? "").trim()}`;
    if (!dedupeKey) continue;

    const existing = byPlate.get(dedupeKey);
    if (!existing || locationFreshness(loc) >= locationFreshness(existing)) {
      byPlate.set(dedupeKey, loc);
    }
  }

  const sorted = [...byPlate.values()].sort((a, b) => {
    const officeCmp = compareOffices(a?.office, b?.office);
    if (officeCmp !== 0) return officeCmp;
    const unitCmp = String(a?.unit ?? "").localeCompare(
      String(b?.unit ?? ""),
      undefined,
      { sensitivity: "base" }
    );
    if (unitCmp !== 0) return unitCmp;
    return String(a?.mobile_plate ?? "").localeCompare(
      String(b?.mobile_plate ?? ""),
      undefined,
      { sensitivity: "base" }
    );
  });

  return sorted.map((loc, index) => ({
    number: index + 1,
    office: text(loc?.office),
    unit: text(loc?.unit),
    plateNumber: text(loc?.mobile_plate),
    mobileNumber: text(loc?.mobile_phone),
    callSign: text(loc?.radio_call_sign),
    visibilityPoints: formatVisibilityPointsCell(loc?.visibility_points),
    designatedPatrolMember: formatDesignatedPatrolMembers(
      loc?.personnel_on_board
    ),
    shifting: formatShiftingCell(loc?.duty_shifts),
  }));
}

function normalizePlateKey(value) {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "");
}

function locationFreshness(loc) {
  const candidates = [loc?.last_seen_at, loc?.created_at, loc?.updated_at];
  let best = 0;
  for (const value of candidates) {
    const time = new Date(value ?? 0).getTime();
    if (Number.isFinite(time) && time > best) best = time;
  }
  return best;
}

export const PATROLLERS_DEPLOYED_HEADERS = [
  "#",
  "Office",
  "Unit",
  "Plate Number",
  "Mobile Number",
  "Call Sign",
  "Fixed Visibility Points",
  "Designated Patrol Member",
  "Shifting (1st shift and 2nd shift)",
];

export function printPatrollersDeployedReport(rows, meta = {}) {
  if (typeof document === "undefined") {
    throw new Error("Print is only available in the browser.");
  }

  const generatedAt = meta.generatedAt ?? new Date();
  const officeFilter = meta.officeFilter ?? "All offices";
  const unitFilter = meta.unitFilter ?? "All units";

  const tableRows = rows
    .map(
      (row) => `<tr>
        <td>${escapeHtml(row.number)}</td>
        <td>${escapeHtml(row.office)}</td>
        <td>${escapeHtml(row.unit)}</td>
        <td>${escapeHtml(row.plateNumber)}</td>
        <td>${escapeHtml(row.mobileNumber)}</td>
        <td>${escapeHtml(row.callSign)}</td>
        <td>${escapeHtml(row.visibilityPoints)}</td>
        <td>${escapeHtml(row.designatedPatrolMember)}</td>
        <td>${escapeHtml(row.shifting)}</td>
      </tr>`
    )
    .join("");

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Patrollers Deployed Report</title>
  <style>
    body { font-family: Arial, sans-serif; color: #111; margin: 24px; }
    h1 { font-size: 18px; margin: 0 0 4px; }
    p { margin: 0 0 6px; font-size: 12px; color: #444; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 11px; }
    th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; vertical-align: top; }
    th { background: #f3f4f6; font-weight: 700; }
    @media print {
      body { margin: 12px; }
    }
  </style>
</head>
<body>
  <h1>Patrollers Deployed</h1>
  <p>Generated: ${escapeHtml(generatedAt.toLocaleString())}</p>
  <p>Office filter: ${escapeHtml(officeFilter)} · Unit filter: ${escapeHtml(unitFilter)}</p>
  <p>Total units: ${rows.length}</p>
  <table>
    <thead>
      <tr>
        ${PATROLLERS_DEPLOYED_HEADERS.map((header) => `<th>${escapeHtml(header)}</th>`).join("")}
      </tr>
    </thead>
    <tbody>
      ${tableRows || `<tr><td colspan="9">No active patrol units found.</td></tr>`}
    </tbody>
  </table>
</body>
</html>`;

  // Hidden iframe avoids popup blockers from window.open().
  const previous = document.getElementById("patrollers-deployed-print-frame");
  if (previous) previous.remove();

  const iframe = document.createElement("iframe");
  iframe.id = "patrollers-deployed-print-frame";
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.style.opacity = "0";
  iframe.style.pointerEvents = "none";
  document.body.appendChild(iframe);

  const frameWindow = iframe.contentWindow;
  const frameDocument = frameWindow?.document;
  if (!frameWindow || !frameDocument) {
    iframe.remove();
    throw new Error("Could not prepare print view.");
  }

  frameDocument.open();
  frameDocument.write(html);
  frameDocument.close();

  const cleanup = () => {
    window.setTimeout(() => {
      iframe.remove();
    }, 1000);
  };

  const triggerPrint = () => {
    try {
      frameWindow.focus();
      frameWindow.print();
    } finally {
      cleanup();
    }
  };

  // Some browsers need a short settle after writing the document.
  if (frameDocument.readyState === "complete") {
    window.setTimeout(triggerPrint, 50);
  } else {
    iframe.onload = () => window.setTimeout(triggerPrint, 50);
    window.setTimeout(triggerPrint, 300);
  }
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
