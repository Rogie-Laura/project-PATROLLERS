import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveSessionTokenFromRequest, SESSION_COOKIE } from "@/lib/auth/session";

export async function POST(request) {
  const token = await resolveSessionTokenFromRequest(request);

  if (token) {
    const admin = createAdminClient();
    await admin.from("user").update({ session: null }).eq("session", token);
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
