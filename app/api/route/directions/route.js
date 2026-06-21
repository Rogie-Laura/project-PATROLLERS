import { NextResponse } from "next/server";
import { authorizeUser } from "@/lib/auth/apiAuth";
import { computeDrivingRoute } from "@/lib/directions/computeRoute";

export const dynamic = "force-dynamic";

export async function POST(request) {
  const { error: authError } = await authorizeUser(request);
  if (authError) return authError;

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

  if (![fromLat, fromLon, toLat, toLon].every((n) => Number.isFinite(n))) {
    return NextResponse.json(
      { error: "fromLat, fromLon, toLat, toLon are required" },
      { status: 400 }
    );
  }

  try {
    const result = await computeDrivingRoute(fromLat, fromLon, toLat, toLon);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err?.message || "Routing failed" },
      { status: 502 }
    );
  }
}
