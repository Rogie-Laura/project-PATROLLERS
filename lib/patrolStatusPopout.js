export const PATROL_STATUS_POPOUT_CHANNEL = "patrollers-patrol-status-popout";

export const POPOUT_WINDOW_NAME = "patrollers-patrol-status-popout";

export const POPOUT_MESSAGE = {
  SELECT_UNIT: "select-unit",
  POPOUT_OPEN: "popout-open",
  POPOUT_CLOSED: "popout-closed",
  SYNC_SELECTION: "sync-selection",
};

export function patrolUnitKey(location) {
  if (!location) return null;
  return location.access_token_id || location.user_id || null;
}

export function getPatrolStatusPopoutPath() {
  return "/patrol-status-popout";
}

export function openPatrolStatusPopoutWindow() {
  if (typeof window === "undefined") return null;

  const url = `${window.location.origin}${getPatrolStatusPopoutPath()}`;
  const features = [
    "width=360",
    "height=720",
    "menubar=no",
    "toolbar=no",
    "location=no",
    "status=no",
    "resizable=yes",
    "scrollbars=yes",
  ].join(",");

  return window.open(url, POPOUT_WINDOW_NAME, features);
}

export function createPatrolStatusPopoutChannel() {
  if (typeof BroadcastChannel === "undefined") return null;
  return new BroadcastChannel(PATROL_STATUS_POPOUT_CHANNEL);
}

export function postPopoutMessage(channel, type, payload) {
  if (!channel) return;
  channel.postMessage({ type, payload });
}
