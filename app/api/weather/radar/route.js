import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const RAINVIEWER_META_URL = "https://api.rainviewer.com/public/weather-maps.json";

/** NEXRAD Level III — vivid blues→yellow→red, closer to Zoom Earth radar look. */
const RADAR_COLOR_SCHEME = 6;
const TILE_SIZE = 512;
/** smooth_snow: blur on, snow colors on */
const RADAR_OPTIONS = "1_1";

function latestFrame(frames) {
  if (!Array.isArray(frames) || frames.length === 0) return null;
  return frames[frames.length - 1] ?? null;
}

function tileTemplate(host, path, { color = 0, options = "0_0" } = {}) {
  return `${host}${path}/${TILE_SIZE}/{z}/{x}/{y}/${color}/${options}.png`;
}

export async function GET() {
  try {
    const res = await fetch(RAINVIEWER_META_URL, { next: { revalidate: 300 } });
    if (!res.ok) {
      return NextResponse.json(
        { error: "Could not load rain radar metadata." },
        { status: 502 },
      );
    }

    const data = await res.json();
    const host = String(data?.host ?? "https://tilecache.rainviewer.com").replace(
      /\/$/,
      "",
    );
    const radarPast = Array.isArray(data?.radar?.past) ? data.radar.past : [];
    const radarNowcast = Array.isArray(data?.radar?.nowcast)
      ? data.radar.nowcast
      : [];
    const radarFrames = [...radarPast, ...radarNowcast];
    const satelliteFrames = Array.isArray(data?.satellite?.infrared)
      ? data.satellite.infrared
      : [];

    const radarLatest = latestFrame(radarFrames);
    const satelliteLatest = latestFrame(satelliteFrames);

    const radarPath = String(radarLatest?.path ?? "").trim();
    if (!radarPath) {
      return NextResponse.json(
        { error: "Rain radar path is unavailable." },
        { status: 503 },
      );
    }

    const satellitePath = String(satelliteLatest?.path ?? "").trim();

    return NextResponse.json({
      ok: true,
      host,
      path: radarPath,
      time: radarLatest.time ?? null,
      tileUrlTemplate: tileTemplate(host, radarPath, {
        color: RADAR_COLOR_SCHEME,
        options: RADAR_OPTIONS,
      }),
      satellitePath: satellitePath || null,
      satelliteTime: satelliteLatest?.time ?? null,
      satelliteTileUrlTemplate: satellitePath
        ? tileTemplate(host, satellitePath, { color: 0, options: "0_0" })
        : null,
    });
  } catch {
    return NextResponse.json(
      { error: "Could not load rain radar metadata." },
      { status: 502 },
    );
  }
}
