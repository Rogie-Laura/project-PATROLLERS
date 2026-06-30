import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const RAINVIEWER_META_URL = "https://api.rainviewer.com/public/weather-maps.json";

export async function GET() {
  try {
    const res = await fetch(RAINVIEWER_META_URL, { next: { revalidate: 300 } });
    if (!res.ok) {
      return NextResponse.json(
        { error: "Could not load rain radar metadata." },
        { status: 502 }
      );
    }

    const data = await res.json();
    const host = String(data?.host ?? "https://tilecache.rainviewer.com").replace(/\/$/, "");
    const past = Array.isArray(data?.radar?.past) ? data.radar.past : [];
    const nowcast = Array.isArray(data?.radar?.nowcast) ? data.radar.nowcast : [];
    const frames = [...past, ...nowcast];

    if (frames.length === 0) {
      return NextResponse.json(
        { error: "Rain radar frames are unavailable." },
        { status: 503 }
      );
    }

    const latest = frames[frames.length - 1];
    const path = String(latest?.path ?? "").trim();
    if (!path) {
      return NextResponse.json(
        { error: "Rain radar path is unavailable." },
        { status: 503 }
      );
    }

    return NextResponse.json({
      ok: true,
      host,
      path,
      time: latest.time ?? null,
      tileUrlTemplate: `${host}${path}/256/{z}/{x}/{y}/2/1_1.png`,
    });
  } catch {
    return NextResponse.json(
      { error: "Could not load rain radar metadata." },
      { status: 502 }
    );
  }
}
