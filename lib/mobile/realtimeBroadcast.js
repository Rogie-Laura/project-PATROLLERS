/**
 * Push instant signals to a mobile unit via Supabase Realtime Broadcast.
 * Channel name uses access_token_id (unguessable UUID) — mobile subscribes on login.
 */

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} admin
 * @param {string} accessTokenId
 * @param {string} event
 * @param {Record<string, string>} [payload]
 */
export async function broadcastToMobileUnit(
  admin,
  accessTokenId,
  event,
  payload = {}
) {
  const id = String(accessTokenId ?? "").trim();
  const eventName = String(event ?? "").trim();
  if (!id || !eventName) return { ok: false, skipped: true };

  const channel = admin.channel(`mobile:${id}`, {
    config: { broadcast: { ack: false } },
  });

  try {
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error("Realtime broadcast subscribe timeout")),
        5000
      );
      channel.subscribe((status) => {
        if (status === "SUBSCRIBED") {
          clearTimeout(timeout);
          resolve();
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          clearTimeout(timeout);
          reject(new Error(`Realtime channel ${status}`));
        }
      });
    });

    await channel.send({
      type: "broadcast",
      event: eventName,
      payload: Object.fromEntries(
        Object.entries(payload).map(([k, v]) => [k, String(v ?? "")])
      ),
    });

    await admin.removeChannel(channel);
    return { ok: true };
  } catch (err) {
    try {
      await admin.removeChannel(channel);
    } catch (_) {
      // ignore cleanup errors
    }
    console.error("Realtime broadcast failed:", err.message);
    return { ok: false, error: err.message };
  }
}
