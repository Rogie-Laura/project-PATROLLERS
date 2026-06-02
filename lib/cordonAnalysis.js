import { distanceMeters, formatDistanceKm, zoneForDistanceMeters } from "@/lib/geo";

const HIGHWAY_ESCAPE_SCORE = {
  motorway: 6,
  trunk: 5,
  primary: 4,
  secondary: 3,
  tertiary: 2,
};

function nodeLabel(tags = {}) {
  if (tags.highway === "motorway_junction") return "Highway junction";
  if (tags.highway === "traffic_signals") return "Signalized intersection";
  if (tags.highway === "stop") return "Stop-controlled intersection";
  if (tags.junction === "roundabout") return "Roundabout";
  if (tags.junction === "yes") return "Road intersection";
  if (tags.highway === "mini_roundabout") return "Mini roundabout";
  return "Intersection / choke point";
}

function scoreCheckpoint(tags, distanceMeters) {
  let score = 0;

  if (tags.highway === "motorway_junction") score += 8;
  if (tags.highway === "traffic_signals") score += 6;
  if (tags.junction === "roundabout") score += 5;
  if (tags.junction === "yes") score += 4;
  if (tags.highway === "stop") score += 3;
  if (tags.highway === "mini_roundabout") score += 3;

  if (distanceMeters <= 1000) score += 6;
  else if (distanceMeters <= 3000) score += 4;
  else if (distanceMeters <= 6000) score += 2;

  return score;
}

function priorityFromScore(score) {
  if (score >= 12) return "high";
  if (score >= 8) return "medium";
  return "low";
}

function dedupeNodes(nodes) {
  const seen = new Map();

  for (const node of nodes) {
    const key = `${node.lat.toFixed(5)},${node.lon.toFixed(5)}`;
    const existing = seen.get(key);
    if (!existing || node.score > existing.score) {
      seen.set(key, node);
    }
  }

  return Array.from(seen.values());
}

export function analyzeCordon({ incidentLat, incidentLon, osmNodes, osmWays }) {
  const checkpoints = (osmNodes || [])
    .map((element) => {
      const lat = element.lat;
      const lon = element.lon;
      if (lat == null || lon == null) return null;

      const dist = distanceMeters(incidentLat, incidentLon, lat, lon);
      if (dist > 5000) return null;

      const tags = element.tags || {};
      const score = scoreCheckpoint(tags, dist);

      return {
        id: String(element.id),
        latitude: lat,
        longitude: lon,
        label: nodeLabel(tags),
        type: tags.highway || tags.junction || "intersection",
        distanceMeters: Math.round(dist),
        distanceLabel: formatDistanceKm(dist),
        zone: zoneForDistanceMeters(dist),
        score,
        priority: priorityFromScore(score),
      };
    })
    .filter(Boolean);

  const rankedCheckpoints = dedupeNodes(checkpoints)
    .sort((a, b) => b.score - a.score)
    .slice(0, 20);

  const escapeRoutes = (osmWays || [])
    .map((way) => {
      const tags = way.tags || {};
      const highway = tags.highway;
      const baseScore = HIGHWAY_ESCAPE_SCORE[highway] || 0;
      if (!baseScore) return null;

      const geometry = way.geometry || [];
      if (geometry.length < 2) return null;

      const coordinates = geometry.map((p) => [p.lat, p.lon]);
      const distances = coordinates.map((c) =>
        distanceMeters(incidentLat, incidentLon, c[0], c[1])
      );
      const minDist = Math.min(...distances);
      const maxDist = Math.max(...distances);

      // Likely escape corridor: road reaches outward from inner zone toward outer ring
      if (maxDist < 1500 || minDist > 6000) return null;
      if (maxDist - minDist < 800) return null;

      const outwardScore = baseScore + (maxDist > 3000 ? 2 : 0);

      return {
        id: String(way.id),
        name: tags.name || tags.ref || `${highway} corridor`,
        highway,
        coordinates,
        minDistanceMeters: Math.round(minDist),
        maxDistanceMeters: Math.round(maxDist),
        score: outwardScore,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score)
    .slice(0, 12);

  const highCount = rankedCheckpoints.filter((c) => c.priority === "high").length;

  const summary =
    rankedCheckpoints.length === 0
      ? "No major intersections found in OpenStreetMap for this zone. Verify on the ground and use local knowledge."
      : `Suggested ${rankedCheckpoints.length} cordon point(s) (${highCount} high priority) within 6 km. Prioritize signalized junctions and roads leading outward for possible escape routes. Confirm with field units before blocking roads.`;

  return {
    checkpoints: rankedCheckpoints,
    escapeRoutes,
    summary,
    generatedAt: new Date().toISOString(),
  };
}
