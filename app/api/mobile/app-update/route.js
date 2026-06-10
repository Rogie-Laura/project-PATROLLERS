import { NextResponse } from "next/server";
import {
  evaluateMobileUpdate,
  normalizeVersionCode,
} from "@/lib/mobile/appRelease";
import { getMobileAppRelease } from "@/lib/mobile/systemSettings";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const installed = normalizeVersionCode(searchParams.get("version_code"), 0);
  const release = await getMobileAppRelease();
  const update = evaluateMobileUpdate(installed, release);

  return NextResponse.json({
    ok: true,
    ...update,
  });
}
