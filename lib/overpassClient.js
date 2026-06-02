const OVERPASS_ENDPOINTS = [
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass-api.de/api/interpreter",
];

/** Lighter query — fits Vercel ~10s limit; 5 km nodes + 4 km major roads */
export function buildCordonOverpassQuery(lat, lon) {
  return `[out:json][timeout:12];
(
  node(around:5000,${lat},${lon})["highway"="traffic_signals"];
  node(around:5000,${lat},${lon})["highway"="stop"];
  node(around:5000,${lat},${lon})["highway"="motorway_junction"];
  node(around:5000,${lat},${lon})["junction"="roundabout"];
  way(around:4000,${lat},${lon})["highway"~"motorway|trunk|primary|secondary"];
);
out body geom;`;
}

export async function fetchOverpassElements(lat, lon) {
  const query = buildCordonOverpassQuery(lat, lon);
  const body = `data=${encodeURIComponent(query)}`;
  let lastError = null;

  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
        },
        body,
        cache: "no-store",
      });

      if (!response.ok) {
        lastError = new Error(`Overpass ${response.status} at ${endpoint}`);
        continue;
      }

      const payload = await response.json();
      if (!Array.isArray(payload?.elements)) {
        lastError = new Error("Invalid Overpass response");
        continue;
      }

      return payload.elements;
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError ?? new Error("All Overpass servers failed");
}
