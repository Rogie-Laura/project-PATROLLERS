import { NextResponse } from "next/server";

const OSRM_BASE = "https://router.project-osrm.org/route/v1/driving";

export const dynamic = "force-dynamic";

export async function POST(request) {
  let body;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const fromLat = Number(body?.fromLat);
  const fromLon = Number(body?.fromLon);
  const toLat = Number(body?.toLat);
  const toLon = Number(body?.toLon);

  if (
    ![fromLat, fromLon, toLat, toLon].every((n) => Number.isFinite(n))
  ) {
    return NextResponse.json(
      { error: "fromLat, fromLon, toLat, toLon are required" },
      { status: 400 }
    );
  }

  try {
    const url = `${OSRM_BASE}/${fromLon},${fromLat};${toLon},${toLat}?overview=simplified&geometries=geojson`;
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": "PATROLLERS-Monitoring/1.0 (dispatch routing)",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Routing service unavailable" },
        { status: 502 }
      );
    }

    const data = await response.json();
    const route = data?.routes?.[0];

    if (data?.code !== "Ok" || !route) {
      return NextResponse.json({ error: "No route found" }, { status: 404 });
    }

    const coordinates = (route.geometry?.coordinates ?? []).map(
      ([lon, lat]) => [lat, lon]
    );

    return NextResponse.json({
      distanceMeters: route.distance,
      durationSeconds: route.duration,
      coordinates,
    });
  } catch {
    return NextResponse.json({ error: "Routing failed" }, { status: 500 });
  }
}
