import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildSessionCookie } from "@/lib/auth/session";

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const email = String(body?.email ?? "").trim().toLowerCase();
  const password = String(body?.password ?? "");

  if (!email || !password) {
    return NextResponse.json(
      { error: "Enter your email and password." },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  const { data: user, error } = await admin
    .from("user")
    .select("*")
    .eq("email", email)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: "Login failed. Please try again." },
      { status: 500 }
    );
  }

  if (!user || user.password !== password) {
    return NextResponse.json(
      { error: "Invalid email or password." },
      { status: 401 }
    );
  }

  // Single device: overwrite the session token so any other device is signed out.
  const token = randomUUID();
  const { error: updateError } = await admin
    .from("user")
    .update({ session: token })
    .eq("id", user.id);

  if (updateError) {
    return NextResponse.json(
      { error: "Could not start a session. Please try again." },
      { status: 500 }
    );
  }

  const response = NextResponse.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      rank: user.rank,
      full_name: user.full_name,
      rank_fullname: user.rank_fullname,
      badge_number: user.badge_number,
      office: user.office,
      unit: user.unit,
      role: user.role,
    },
  });

  response.cookies.set(buildSessionCookie(token));
  return response;
}
