import { NextResponse } from "next/server";
import { analyzeCordon } from "@/lib/cordonAnalysis";
import { fetchOverpassElements } from "@/lib/overpassClient";

/** Allow longer fetch on Vercel Pro; Hobby still capped ~10s */
export const maxDuration = 30;

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

    return NextResponse.json(plan);
  } catch (err) {
    const message =
      err?.message?.includes("timeout") || err?.name === "TimeoutError"
        ? "Road data request timed out. Try again in a few seconds."
        : "Road network data temporarily unavailable. The map will retry from your browser.";

    return NextResponse.json({ error: message, retryable: true }, { status: 502 });
  }
}
