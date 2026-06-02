// overpass-api.de is most reliable when a User-Agent is sent; others rate-limit.
const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

// Overpass requires a descriptive User-Agent; missing it returns 406/429.
const OVERPASS_USER_AGENT =
  "PATROLLERS-Monitoring/1.0 (police patrol monitoring; public safety)";

const REQUEST_TIMEOUT_MS = 12000;

async function fetchOverpassQuery(query, endpoint) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
        "User-Agent": OVERPASS_USER_AGENT,
      },
      body: `data=${encodeURIComponent(query)}`,
      signal: controller.signal,
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Overpass HTTP ${response.status}`);
    }

    const payload = await response.json();
    if (!Array.isArray(payload?.elements)) {
      throw new Error("Invalid Overpass response");
    }

    return payload.elements;
  } finally {
    clearTimeout(timer);
  }
}

/** Fast: intersections only (~2–5 s) */
export function buildNodesQuery(lat, lon) {
  return `[out:json][timeout:8];
(
  node(around:4500,${lat},${lon})["highway"="traffic_signals"];
  node(around:4500,${lat},${lon})["highway"="stop"];
  node(around:4500,${lat},${lon})["highway"="motorway_junction"];
  node(around:4500,${lat},${lon})["junction"="roundabout"];
);
out;`;
}

/** Slower: major roads for escape corridors (optional) */
export function buildWaysQuery(lat, lon) {
  return `[out:json][timeout:8];
way(around:3500,${lat},${lon})["highway"~"motorway|trunk|primary|secondary"];
out geom;`;
}

async function runQueryOnAnyServer(query) {
  let lastError = null;

  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      return await fetchOverpassQuery(query, endpoint);
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError ?? new Error("All Overpass servers failed");
}

export async function fetchOverpassElements(lat, lon) {
  const nodes = await runQueryOnAnyServer(buildNodesQuery(lat, lon));

  let ways = [];
  try {
    ways = await runQueryOnAnyServer(buildWaysQuery(lat, lon));
  } catch {
    /* checkpoints still useful without escape polylines */
  }

  return [...nodes, ...ways.filter((el) => el.type === "way")];
}
