import { NextResponse } from "next/server";
import { fetchGdacsTyphoonTracks } from "@/lib/gdacsCyclones";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await fetchGdacsTyphoonTracks();
    return NextResponse.json({ ok: true, ...data });
  } catch (error) {
    return NextResponse.json(
      { error: error.message ?? "Could not load typhoon tracks." },
      { status: 502 }
    );
  }
}
