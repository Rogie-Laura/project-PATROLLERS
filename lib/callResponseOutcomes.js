export const CALL_RESPONSE_STATUS = {
  active: "active",
  closed: "closed",
};

export const CLOSURE_OUTCOMES = [
  {
    value: "vehicular_accident_referred",
    label: "Vehicular Accident — Referred at Local Station",
  },
  {
    value: "suspect_arrested",
    label: "Suspect was Arrested",
  },
  {
    value: "prank_call",
    label: "Prank Call",
  },
  {
    value: "other",
    label: "Others — please specify",
  },
];

export function getClosureOutcomeLabel(value) {
  const match = CLOSURE_OUTCOMES.find((o) => o.value === value);
  return match?.label ?? value ?? "—";
}

export function normalizeClosureOutcome(value) {
  const raw = String(value ?? "").trim();
  if (CLOSURE_OUTCOMES.some((o) => o.value === raw)) return raw;
  return null;
}
