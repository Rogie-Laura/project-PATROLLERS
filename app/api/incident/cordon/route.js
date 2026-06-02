import { NextResponse } from "next/server";
import { analyzeCordon } from "@/lib/cordonAnalysis";

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";

function buildOverpassQuery(lat, lon) {
  return `
[out:json][timeout:30];
(
  node(around:6000,${lat},${lon})["highway"="traffic_signals"];
  node(around:6000,${lat},${lon})["highway"="stop"];
  node(around:6000,${lat},${lon})["highway"="motorway_junction"];
  node(around:6000,${lat},${lon})["highway"="mini_roundabout"];
  node(around:6000,${lat},${lon})["junction"~"yes|roundabout"];
  way(around:6000,${lat},${lon})["highway"~"motorway|trunk|primary|secondary|tertiary"]["highway"!~"footway|path|cycleway|steps|track"];
);
out body geom;
`;
}

export async function POST(request) {
  let body;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const latitude = Number(body?.latitude);
  const longitude = Number(body?.longitude);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return NextResponse.json(
      { error: "latitude and longitude are required" },
      { status: 400 }
    );
  }

  try {
    const query = buildOverpassQuery(latitude, longitude);
    const response = await fetch(OVERPASS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: `data=${encodeURIComponent(query)}`,
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Road network data temporarily unavailable" },
        { status: 502 }
      );
    }

    const payload = await response.json();
    const elements = Array.isArray(payload?.elements) ? payload.elements : [];

    const osmNodes = elements.filter((el) => el.type === "node");
    const osmWays = elements.filter((el) => el.type === "way");

    const plan = analyzeCordon({
      incidentLat: latitude,
      incidentLon: longitude,
      osmNodes,
      osmWays,
    });

    return NextResponse.json(plan);
  } catch {
    return NextResponse.json(
      { error: "Failed to analyze cordon suggestions" },
      { status: 500 }
    );
  }
}
