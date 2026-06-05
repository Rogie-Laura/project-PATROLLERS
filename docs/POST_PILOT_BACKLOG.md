# PATROLLERS — Post-pilot backlog

Notes for work **after pilot**, when a **new mobile APK** install is acceptable.
Do not implement during pilot unless explicitly approved (stable APK + Supabase/API).

---

## P0 — Public safety (dispatch)

- **Instant dispatch alarm** on mobile via **Supabase Realtime** (Phase 1) + **FCM** (Phase 2 backup when app background/killed).
- **Instant respond UX** — open navigation immediately; sync status/location in background (no blocking sequential API chain).
- **Firebase:** org Gmail → one Firebase project for **FCM only** (not full Firebase stack). FCM cost ~₱0 at dispatch volume.
- **Location send unchanged:** 3-minute default interval, controlled by System Settings (30s–24h). Realtime/FCM for **alarm only**, not GPS cadence.

---

## P1 — Force location (monitor → mobile, silent)

Remote **fresh GPS send** from command center. **No alarm / no siren.** Patroller does not press anything on the phone.

### How it works

1. Monitor triggers request (single unit, per station, or batch).
2. Server writes lightweight request row(s); signal via **Realtime + silent FCM**.
3. Mobile app (tracking on) calls existing `sendNow()` → `insert_mobile_location` RPC.
4. Monitor tracks results via Realtime; map updates on success.

### Batch UX (recommended for 10–300 units)

Progress panel while batch runs:

- Progress bar: `142 / 300`
- **Summary (clickable):** Successful | Failed | Pending — click count to expand full list
- Per-unit row: name, status, timestamp, failure reason

| Status | Meaning |
|--------|---------|
| Pending | Signal sent; waiting for phone |
| Success | Fresh GPS received |
| Failed | Timeout (~60–90s), tracking off, app unreachable, no GPS/signal |

Phones respond **in parallel, staggered** (not sequential server fetch). DB load at 300 units is **not a bottleneck** (~30 writes/sec worst case).

### Do not use

- **Replay last known coordinates** (`pushLocationSnapshot`) as “force location” — stale if unit moved.

### Schema (draft)

- `location_request_batches` — id, created_by, created_at, totals
- `location_request_items` — batch_id, access_token_id, status, requested_at, responded_at, location_update_id, failure_reason

### Requires

- Monitor UI (button + batch panel)
- Mobile listener (new APK)
- Realtime/FCM infra (same stack as P0 dispatch)

---

## P2 — Mobile tracking reliability

- Auto-send location on network reconnect after call/outage.
- Reset interval timer after manual send.
- Retry failed timer sends (today: silent `catch`).

---

## P3 — Monitor / ops polish

- Fix sticky “Could not load patrol locations” banner (clear on successful refresh).
- Schedule Supabase retention cron for `prune_old_location_updates(90)`.

---

## Cost reminder (10 mobiles + 10 filtered monitors)

- Stack ~**₱4,000/month** (Supabase Pro + Vercel Pro + domain).
- Force location + dispatch Realtime/FCM add **~₱0** at this scale.
- Full Firebase stack **not** planned — FCM only.

---

## Pilot rule (unchanged)

- **1 access token = 1 phone.**
- No breaking Supabase/API changes during pilot.
- No new APK unless explicitly requested.
