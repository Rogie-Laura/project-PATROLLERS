import { NextResponse } from "next/server";
import { authorizeSmartLocator } from "@/lib/smartLocator/authorize";

export async function GET(request) {
  const { user, error } = await authorizeSmartLocator(request);
  if (error) return error;

  return NextResponse.json({
    ok: true,
    user,
    scope: {
      office: user.office,
      unit: user.unit,
    },
  });
}
