import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildSessionCookie, resolveSessionTokenFromRequest, SESSION_MAX_AGE } from "@/lib/auth/session";
import {
  hashPassword,
  isPasswordHash,
  verifyPassword,
} from "@/lib/auth/password";
import { normalizeRole } from "@/lib/auth/roles";
import {
  evaluateSessionLogin,
  SESSION_ACTIVE_CODE,
  SESSION_ACTIVE_MESSAGE,
} from "@/lib/auth/sessionPolicy";
import { accountAccessBlock } from "@/lib/auth/subscription";

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const username = String(body?.username ?? "").trim().toLowerCase();
  const email = String(body?.email ?? "").trim().toLowerCase();
  const password = String(body?.password ?? "");

  const loginField = username ? "username" : email ? "email" : null;
  const loginValue = username || email;

  if (!loginField || !password) {
    return NextResponse.json(
      {
        error: username || !email
          ? "Enter your username and password."
          : "Enter your email and password.",
      },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  const { data: user, error } = await admin
    .from("user")
    .select("*")
    .eq(loginField, loginValue)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: "Login failed. Please try again." },
      { status: 500 }
    );
  }

  if (!user || !verifyPassword(password, user.password)) {
    return NextResponse.json(
      {
        error:
          loginField === "username"
            ? "Invalid username or password."
            : "Invalid email or password.",
      },
      { status: 401 }
    );
  }

  const block = accountAccessBlock(user);
  if (block) {
    return NextResponse.json(
      { error: block.message, code: block.code },
      { status: 403 }
    );
  }

  const requestSessionToken = await resolveSessionTokenFromRequest(request);
  const sessionDecision = evaluateSessionLogin(
    user,
    requestSessionToken,
    SESSION_MAX_AGE
  );

  if (!sessionDecision.allowed) {
    return NextResponse.json(
      {
        error: SESSION_ACTIVE_MESSAGE,
        code: SESSION_ACTIVE_CODE,
      },
      { status: 409 }
    );
  }

  const token = randomUUID();
  const sessionUpdate = {
    session: token,
    session_started_at: new Date().toISOString(),
  };
  if (!isPasswordHash(user.password)) {
    sessionUpdate.password = hashPassword(password);
  }

  const { error: updateError } = await admin
    .from("user")
    .update(sessionUpdate)
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
      role: normalizeRole(user.role),
    },
  });

  response.cookies.set(buildSessionCookie(token));
  return response;
}
