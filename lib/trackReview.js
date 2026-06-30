/** Build Review Track URL for a patrol unit key (access_token_id or user_id). */
export function trackReviewHref(unitKey) {
  if (!unitKey) return "/track-review";
  return `/track-review?unit=${encodeURIComponent(unitKey)}`;
}

export function readTrackReviewUnitKey(searchParams) {
  const value = searchParams?.get?.("unit") ?? searchParams?.unit;
  return typeof value === "string" ? value.trim() : "";
}
