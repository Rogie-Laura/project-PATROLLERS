import { createClient } from "@supabase/supabase-js";

/** Server-only client for PRO4A COMMAND Supabase (establishments data). */
export function createCommandAdminClient() {
  const url = process.env.COMMAND_SUPABASE_URL?.trim();
  const serviceKey = process.env.COMMAND_SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !serviceKey) {
    throw new Error(
      "Missing COMMAND Supabase env vars (COMMAND_SUPABASE_URL / COMMAND_SUPABASE_SERVICE_ROLE_KEY).",
    );
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function isCommandSupabaseConfigured() {
  return Boolean(
    process.env.COMMAND_SUPABASE_URL?.trim() &&
      process.env.COMMAND_SUPABASE_SERVICE_ROLE_KEY?.trim(),
  );
}
