import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    ok: true,
    rainRadar: true,
    typhoonTrack: true,
    openWeatherMap: Boolean(process.env.OPENWEATHERMAP_API_KEY?.trim()),
  });
}
