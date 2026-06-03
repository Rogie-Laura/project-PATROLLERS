import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import {
  normalizeClosureOutcome,
  getClosureOutcomeLabel,
} from "@/lib/callResponseOutcomes";
import { callResponseFromRow } from "@/lib/callResponses";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function PATCH(request, { params }) {
  const user = await getCurrentUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const id = (await params)?.id;
  if (!id) {
    return NextResponse.json({ error: "Missing incident id." }, { status: 400 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (body?.action !== "close") {
    return NextResponse.json({ error: "Unsupported action." }, { status: 400 });
  }

  const outcome = normalizeClosureOutcome(body?.outcome);
  if (!outcome) {
    return NextResponse.json(
      { error: "Select a valid response outcome." },
      { status: 400 }
    );
  }

  const remarks = String(body?.remarks ?? "").trim();
  if (outcome === "other" && !remarks) {
    return NextResponse.json(
      { error: "Please specify what happened for Others." },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  const { data: existing, error: fetchError } = await admin
    .from("call_responses")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  if (!existing) {
    return NextResponse.json({ error: "Incident not found." }, { status: 404 });
  }

  if (existing.status === "closed") {
    return NextResponse.json({ error: "Incident is already closed." }, { status: 409 });
  }

  const closedAt = new Date().toISOString();
  const { data, error } = await admin
    .from("call_responses")
    .update({
      status: "closed",
      closure_outcome: outcome,
      closure_remarks: remarks || null,
      closed_at: closedAt,
      closed_by: user.id,
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    callResponse: callResponseFromRow(data),
    closureSummary:
      outcome === "other"
        ? remarks
        : getClosureOutcomeLabel(outcome),
  });
}
