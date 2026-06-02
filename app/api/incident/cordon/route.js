import { NextResponse } from "next/server";
import { analyzeCordon } from "@/lib/cordonAnalysis";
import { fetchOverpassElements } from "@/lib/overpassClient";

export const maxDuration = 25;
export const dynamic = "force-dynamic";

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
    const elements = await fetchOverpassElements(latitude, longitude);
    const osmNodes = elements.filter((el) => el.type === "node");
    const osmWays = elements.filter((el) => el.type === "way");

    const plan = analyzeCordon({
      incidentLat: latitude,
      incidentLon: longitude,
      osmNodes,
      osmWays,
    });

    return NextResponse.json({
      ...plan,
      partial: osmWays.length === 0 && (plan.escapeRoutes?.length ?? 0) === 0,
    });
  } catch (err) {
    const isTimeout =
      err?.name === "AbortError" || String(err?.message || "").includes("abort");

    return NextResponse.json(
      {
        error: isTimeout
          ? "Road data timed out. Tap Retry — intersections load first when the service is busy."
          : "Road network data temporarily unavailable. Tap Retry.",
      },
      { status: 502 }
    );
  }
}
