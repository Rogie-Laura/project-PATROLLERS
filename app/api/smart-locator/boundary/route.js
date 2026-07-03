import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { isCommandCenterRole } from "@/lib/auth/roles";
import { boundaryForUser } from "@/lib/smartLocator/unitBoundaries";

export async function GET(request) {
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (!isCommandCenterRole(user.role)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const boundary = boundaryForUser(user);

  return NextResponse.json({
    ok: true,
    boundary,
  });
}
