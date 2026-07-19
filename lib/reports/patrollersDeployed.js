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
  const sorted = [...locations].sort((a, b) => {
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

export function rowsToCsv(rows) {
  const escape = (value) => {
    const raw = String(value ?? "");
    if (/[",\n\r]/.test(raw)) {
      return `"${raw.replace(/"/g, '""')}"`;
    }
    return raw;
  };

  const lines = [
    PATROLLERS_DEPLOYED_HEADERS.map(escape).join(","),
    ...rows.map((row) =>
      [
        row.number,
        row.office,
        row.unit,
        row.plateNumber,
        row.mobileNumber,
        row.callSign,
        row.visibilityPoints,
        row.designatedPatrolMember,
        row.shifting,
      ]
        .map(escape)
        .join(",")
    ),
  ];

  return `${lines.join("\r\n")}\r\n`;
}

export function downloadCsv(filename, csvText) {
  const blob = new Blob([csvText], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function printPatrollersDeployedReport(rows, meta = {}) {
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

  const printWindow = window.open("", "_blank", "noopener,noreferrer,width=1100,height=800");
  if (!printWindow) {
    throw new Error("Pop-up blocked. Allow pop-ups to print the report.");
  }
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  window.setTimeout(() => {
    printWindow.print();
  }, 250);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
