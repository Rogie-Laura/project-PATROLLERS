import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

function loadEnv() {
  const raw = readFileSync(resolve(".env.local"), "utf8");
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx);
    let value = trimmed.slice(idx + 1);
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnv();

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

const rows = JSON.parse(
  readFileSync(resolve("tmp-smart-locator-tokens.json"), "utf8")
).map((row) => ({
  access_token: row.access_token,
  office: row.office,
  unit: row.unit,
  role: row.role,
  is_active: true,
}));

const { error } = await admin.from("smart_locator_access_tokens").insert(rows);
if (error) {
  console.error(error);
  process.exit(1);
}

const { count, error: countError } = await admin
  .from("smart_locator_access_tokens")
  .select("*", { count: "exact", head: true });

if (countError) {
  console.error(countError);
  process.exit(1);
}

console.log("inserted rows, count=", count);
const rosario = rows.find(
  (row) => row.unit === "Rosario MPS" && row.office === "Cavite PPO"
);
console.log("Rosario Cavite token=", rosario?.access_token);
