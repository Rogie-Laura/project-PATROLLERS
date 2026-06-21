import { NextResponse } from "next/server";
import { authorizeUser } from "@/lib/auth/apiAuth";

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";

export async function GET(request) {
  const { error: authError } = await authorizeUser(request);
  if (authError) return authError;

  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";

  if (q.length < 2) {
    return NextResponse.json([]);
  }

  try {
    const url = new URL(NOMINATIM_URL);
    url.searchParams.set("q", q);
    url.searchParams.set("format", "json");
    url.searchParams.set("addressdetails", "1");
    url.searchParams.set("limit", "10");
    url.searchParams.set("countrycodes", "ph");
    // Philippines bounding box (approx.)
    url.searchParams.set("viewbox", "116.0,4.5,127.0,21.5");
    url.searchParams.set("bounded", "1");

    const response = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
        "User-Agent": "PATROLLERS-Monitoring/1.0 (contact: monitoring-center)",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Place search unavailable" },
        { status: 502 }
      );
    }

    const results = await response.json();

    const places = (Array.isArray(results) ? results : []).map((item) => ({
      id: String(item.place_id),
      displayName: item.display_name,
      latitude: parseFloat(item.lat),
      longitude: parseFloat(item.lon),
      type: item.type,
    }));

    return NextResponse.json(places);
  } catch {
    return NextResponse.json({ error: "Place search failed" }, { status: 500 });
  }
}
