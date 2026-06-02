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

const patrolUser = {
  email: "patrol1@patrol.local",
  password: "111111",
  full_name: "Patrol One",
  rank: "Pat",
  badge_number: "PATROL1",
  role: "Patroller",
  office: "PRO4A",
  unit: "Alpha Unit",
};

// Quezon City area — visible near default map center
const patrolLocation = {
  latitude: 14.676,
  longitude: 121.0437,
  accuracy: 12,
};

async function upsertPatrolUser() {
  const { data: existing, error: lookupError } = await admin
    .from("user")
    .select("id, email, badge_number")
    .eq("badge_number", patrolUser.badge_number)
    .maybeSingle();

  if (lookupError) {
    console.error("User lookup failed:", lookupError.message);
    process.exit(1);
  }

  if (existing) {
    const { data, error } = await admin
      .from("user")
      .update(patrolUser)
      .eq("id", existing.id)
      .select("id, email, rank_fullname, badge_number")
      .single();

    if (error) {
      console.error("User update failed:", error.message);
      process.exit(1);
    }

    return data;
  }

  const { data, error } = await admin
    .from("user")
    .insert(patrolUser)
    .select("id, email, rank_fullname, badge_number")
    .single();

  if (error) {
    console.error("User insert failed:", error.message);
    process.exit(1);
  }

  return data;
}

async function insertLocation(user) {
  const { error } = await admin.from("location_updates").insert({
    user_id: user.id,
    latitude: patrolLocation.latitude,
    longitude: patrolLocation.longitude,
    accuracy: patrolLocation.accuracy,
    patrol_name: user.rank_fullname || patrolUser.full_name,
    badge_number: user.badge_number,
  });

  if (error) {
    console.error("Location insert failed:", error.message);
    process.exit(1);
  }
}

async function main() {
  const user = await upsertPatrolUser();
  await insertLocation(user);

  console.log("Patrol user ready:", user.email, `(${user.badge_number})`);
  console.log(
    "Location sent:",
    patrolLocation.latitude,
    patrolLocation.longitude,
    "— refresh the monitoring map to see the marker."
  );
}

main();
