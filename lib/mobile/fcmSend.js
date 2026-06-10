import { createSign } from "crypto";

const FCM_SCOPE = "https://www.googleapis.com/auth/firebase.messaging";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const FCM_BASE = "https://fcm.googleapis.com/v1/projects";

let cachedAccessToken = null;
let tokenExpiresAt = 0;

export function isFcmConfigured() {
  return Boolean(
    process.env.FIREBASE_PROJECT_ID?.trim() &&
      process.env.FIREBASE_CLIENT_EMAIL?.trim() &&
      process.env.FIREBASE_PRIVATE_KEY?.trim()
  );
}

function privateKeyPem() {
  return process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n");
}

function createServiceAccountJwt() {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(
    JSON.stringify({ alg: "RS256", typ: "JWT" })
  ).toString("base64url");
  const payload = Buffer.from(
    JSON.stringify({
      iss: process.env.FIREBASE_CLIENT_EMAIL.trim(),
      sub: process.env.FIREBASE_CLIENT_EMAIL.trim(),
      aud: TOKEN_URL,
      iat: now,
      exp: now + 3600,
      scope: FCM_SCOPE,
    })
  ).toString("base64url");

  const unsigned = `${header}.${payload}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();
  const signature = signer.sign(privateKeyPem()).toString("base64url");
  return `${unsigned}.${signature}`;
}

async function getAccessToken() {
  if (cachedAccessToken && Date.now() < tokenExpiresAt - 60_000) {
    return cachedAccessToken;
  }

  const assertion = createServiceAccountJwt();
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });

  const data = await res.json();
  if (!res.ok || !data.access_token) {
    throw new Error(data.error_description ?? data.error ?? "FCM auth failed.");
  }

  cachedAccessToken = data.access_token;
  tokenExpiresAt = Date.now() + (data.expires_in ?? 3600) * 1000;
  return cachedAccessToken;
}

/**
 * @param {string} fcmToken
 * @param {{ type: string, [key: string]: string }} data
 * @param {{ priority?: 'high' | 'normal' }} [options]
 */
export async function sendFcmDataMessage(fcmToken, data, options = {}) {
  if (!isFcmConfigured()) return { ok: false, skipped: true };

  const token = String(fcmToken ?? "").trim();
  if (!token) return { ok: false, skipped: true };

  const accessToken = await getAccessToken();
  const projectId = process.env.FIREBASE_PROJECT_ID.trim();
  const priority = options.priority === "high" ? "high" : "normal";

  const res = await fetch(`${FCM_BASE}/${projectId}/messages:send`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: {
        token,
        data: Object.fromEntries(
          Object.entries(data).map(([k, v]) => [k, String(v ?? "")])
        ),
        android: { priority },
      },
    }),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body?.error?.message ?? "FCM send failed.");
  }

  return { ok: true, name: body.name };
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} admin
 * @param {string} accessTokenId
 * @param {Record<string, string>} data
 * @param {{ priority?: 'high' | 'normal' }} [options]
 */
export async function sendFcmToAccessToken(admin, accessTokenId, data, options) {
  if (!isFcmConfigured() || !accessTokenId) {
    return { ok: false, skipped: true };
  }

  const { data: row, error } = await admin
    .from("mobile_fcm_tokens")
    .select("fcm_token")
    .eq("access_token_id", accessTokenId)
    .maybeSingle();

  if (error || !row?.fcm_token) {
    return { ok: false, skipped: true };
  }

  try {
    return await sendFcmDataMessage(row.fcm_token, data, options);
  } catch (err) {
    console.error("FCM send failed:", err.message);
    return { ok: false, error: err.message };
  }
}

export async function notifyDispatchAlert(admin, accessTokenId, dispatchId) {
  return sendFcmToAccessToken(
    admin,
    accessTokenId,
    { type: "dispatch", dispatch_id: dispatchId },
    { priority: "high" }
  );
}

export async function notifyLocationRequest(admin, accessTokenId, itemId) {
  return sendFcmToAccessToken(
    admin,
    accessTokenId,
    { type: "location_request", item_id: itemId },
    { priority: "normal" }
  );
}
