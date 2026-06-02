import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

function loadEnv() {
  try {
    const raw = readFileSync(resolve(".env.local"), "utf8");
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const idx = trimmed.indexOf("=");
      if (idx === -1) continue;
      const key = trimmed.slice(0, idx);
      const value = trimmed.slice(idx + 1);
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // ignore
  }
}

loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const userPayload = {
  email: "rjl11@gmail.com",
  password: "111111",
  full_name: "Rogie Laura",
  rank: "PSSg",
  badge_number: "226609",
  role: "phq",
  office: "PRO4A",
  unit: "RICTMD4A",
};

async function main() {
  const { data: existing, error: lookupError } = await admin
    .from("user")
    .select("id, email, badge_number")
    .eq("email", userPayload.email)
    .maybeSingle();

  if (lookupError) {
    if (lookupError.message.includes("email")) {
      console.error(
        "The email column is missing. Run supabase/SETUP_LOGIN.sql in Supabase SQL Editor first."
      );
    } else {
      console.error("Lookup failed:", lookupError.message);
    }
    process.exit(1);
  }

  if (existing) {
    const { error: updateError } = await admin
      .from("user")
      .update(userPayload)
      .eq("id", existing.id);

    if (updateError) {
      console.error("Update failed:", updateError.message);
      process.exit(1);
    }

    console.log("Updated existing user:", userPayload.email);
    return;
  }

  const { data: byBadge, error: badgeError } = await admin
    .from("user")
    .select("id")
    .eq("badge_number", userPayload.badge_number)
    .maybeSingle();

  if (badgeError) {
    console.error("Badge lookup failed:", badgeError.message);
    process.exit(1);
  }

  if (byBadge) {
    const { error: updateError } = await admin
      .from("user")
      .update(userPayload)
      .eq("id", byBadge.id);

    if (updateError) {
      console.error("Update by badge failed:", updateError.message);
      process.exit(1);
    }

    console.log("Updated badge user with email:", userPayload.email);
    return;
  }

  const { error: insertError } = await admin.from("user").insert(userPayload);

  if (insertError) {
    console.error("Insert failed:", insertError.message);
    process.exit(1);
  }

  console.log("Created user:", userPayload.email);
}

main();
