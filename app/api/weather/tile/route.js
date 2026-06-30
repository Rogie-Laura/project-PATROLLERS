import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const ALLOWED_LAYERS = new Set(["clouds_new", "precipitation_new"]);

export async function GET(request) {
  const apiKey = process.env.OPENWEATHERMAP_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      { error: "OpenWeatherMap API key is not configured." },
      { status: 503 }
    );
  }

  const { searchParams } = new URL(request.url);
  const layer = String(searchParams.get("layer") ?? "").trim();
  const z = searchParams.get("z");
  const x = searchParams.get("x");
  const y = searchParams.get("y");

  if (!ALLOWED_LAYERS.has(layer)) {
    return NextResponse.json({ error: "Unsupported weather layer." }, { status: 400 });
  }

  if (z == null || x == null || y == null) {
    return NextResponse.json({ error: "Missing tile coordinates." }, { status: 400 });
  }

  const tileUrl = `https://tile.openweathermap.org/map/${layer}/${z}/${x}/${y}.png?appid=${apiKey}`;

  try {
    const upstream = await fetch(tileUrl, { next: { revalidate: 600 } });
    if (!upstream.ok) {
      return NextResponse.json(
        { error: "Weather tile request failed." },
        { status: upstream.status === 401 ? 503 : 502 }
      );
    }

    const bytes = await upstream.arrayBuffer();
    return new NextResponse(bytes, {
      status: 200,
      headers: {
        "Content-Type": upstream.headers.get("Content-Type") ?? "image/png",
        "Cache-Control": "public, max-age=600",
      },
    });
  } catch {
    return NextResponse.json({ error: "Weather tile request failed." }, { status: 502 });
  }
}
