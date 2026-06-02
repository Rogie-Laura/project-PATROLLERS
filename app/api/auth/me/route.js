import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";

export async function GET(request) {
  const user = await getCurrentUser(request);
  return NextResponse.json({ user });
}
