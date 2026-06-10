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

## P1 — Online presence (heartbeat + Realtime)

While **Live Tracking ON**, monitor must show **🟢 Online** separately from **📍 map position** (3 min GPS).

- **Heartbeat ~60 sec** → `last_seen_at` update (implements “handshake”; not the same as GPS).
- **Supabase Realtime** on mobile → live line + instant dispatch/force-location commands.
- **Monitor:** `Monitor link` from `last_seen`; map pin from last GPS row.
- **Do not** use GPS row age alone as “disconnected” once heartbeat exists.

See also **P0** (Realtime/FCM for alarm) — same WebSocket stack where possible.

---

## P2 — Force location (monitor → mobile, silent)

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

## P3 — Mobile tracking reliability & GPS/data loss

### Pilot behavior today (documented)

| Scenario | Logged in | Map icon | Monitor |
|----------|-----------|----------|---------|
| **Stop tracking** (beacon OK) | Yes | **Removed** | Unit off map |
| **Stop tracking** (beacon fail) | Yes | Stays | Stale / grey |
| **GPS off** or **no mobile data** while tracking ON | Yes | Stays | Stale / grey (no fresh GPS) |
| **Resume** GPS/data | Yes | Stays | Next 3 min timer only (no instant send yet) |

Timer send failures today: **silent** (`catch (_) {}`) — patroller may not notice; monitor sees stale.

### v2 mobile UX (recommended — **no auto logout**)

**Do not** auto-logout when GPS or mobile data is turned off. Patrollers may lose signal briefly (airplane mode, tunnel, dead zone).

Instead:

1. **Warning banner** on dashboard while tracking is ON but GPS is off, permission denied, or no network:
   - e.g. *“Location or data unavailable — command center cannot see your updates.”*
2. **Auto `sendNow()` on resume** when GPS or connectivity returns (do not wait for next 3 min tick).
3. **Retry** failed timer sends (with backoff), not silent discard.
4. **Reset interval timer** after manual send (optional polish).

### Stop tracking vs GPS off

- **Stop tracking** → send `tracking_active: false` beacon → **remove from map** (keep current design).
- **GPS/data off** → stay logged in, stay “tracking” in app, **warn patroller**, monitor shows **No recent update** until resume send succeeds.

### Requires

- New APK (connectivity/GPS listeners, banner UI, reconnect hook).

---

## P5 — Mobile in-app update (OTA)

One-tap Android APK update from inside the app (no Play Store required).

### How it works

1. Admin builds release APK with higher `versionCode` in `pubspec.yaml` (`version: 1.1.0+2`).
2. Upload APK to **HTTPS** storage (Supabase Storage public bucket recommended).
3. **System Settings → Mobile app update (OTA)** — set version code, name, download URL, optional release notes.
4. Mobile checks `GET /api/mobile/app-update?version_code=N` on dashboard load.
5. If server latest > installed → **Update now** button → download + Android install prompt.
6. If below **minimum version code** (or force update checked) → blocking dialog until updated.

### Admin rollout checklist

- [ ] Bump `version: x.y.z+CODE` in Flutter (`+CODE` must increase every release)
- [ ] Build signed release APK (`flutter build apk --release`)
- [ ] Upload APK to HTTPS (verify link opens/download in browser)
- [ ] Save version + URL in System Settings
- [ ] Test on 1–2 phones before fleet rollout
- [ ] Keep previous APK URL/version for rollback if needed

### Requires

- Migration `027_mobile_app_release.sql`
- Web: `/api/mobile/app-update`, System Settings UI
- Mobile: `package_info_plus`, `ota_update`, `REQUEST_INSTALL_PACKAGES` (new APK)
- **First install** of OTA-capable APK is still manual; after that, one-tap updates work

---

## P4 — Monitor / ops polish

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

---

## Web/API implementation status (this repo)

| Item | Web/API | Mobile APK (Flutter, separate repo) |
|------|---------|-------------------------------------|
| **P4** | Sticky banner fix; cron migration `031` | — |
| **P5** | `027`, `/api/mobile/app-update`, System Settings OTA card | `package_info_plus`, `ota_update`, install prompt |
| **P1** | `028` heartbeat, `/api/mobile/heartbeat`, monitor presence Realtime | ~60s heartbeat POST; Supabase Realtime subscribe |
| **P0** | Dispatch Realtime on monitor; FCM send on dispatch (`030`, `/api/mobile/fcm-token`) | Realtime on `call_response_dispatches`; FCM handler; instant respond UX |
| **P2** | `029`, force-location APIs, `ForceLocationPanel` | Realtime/FCM listener → `sendNow()` |
| **P3** | — (server RPC unchanged) | GPS/data banner, reconnect `sendNow()`, retry backoff |

**Apply migrations `027`–`031` on Supabase before testing.**

**FCM (optional):** set `FIREBASE_*` in Vercel. Without them, Realtime still delivers signals when the app is foregrounded.
