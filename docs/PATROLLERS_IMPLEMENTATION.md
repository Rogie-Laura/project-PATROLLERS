# PATROLLERS — Implementation & Operations Guide

**Project:** PRO4A PATROLLERS — Patrol Location Monitoring & Dispatch Assist  
**Command monitor:** https://project-patrollers.vercel.app  
**Executive dashboard:** https://pro4a-command.vercel.app (PRO4A-COMMAND)  
**Repository:** `Rogie-Laura/project-PATROLLERS`  
**Document version:** June 2026  

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Three Applications, One Ecosystem](#2-three-applications-one-ecosystem)
3. [Architecture](#3-architecture)
4. [Mobile Android App — Setup & Daily Use](#4-mobile-android-app--setup--daily-use)
5. [Command Center (PATROLLERS Web)](#5-command-center-patrollers-web)
6. [PRO4A-COMMAND — Chief / Executive Monitoring](#6-pro4a-command--chief--executive-monitoring)
7. [How PATROLLERS Connects to PRO4A-COMMAND](#7-how-patrollers-connects-to-pro4a-command)
8. [Authentication & Security](#8-authentication--security)
9. [Roles & Permissions](#9-roles--permissions)
10. [Operational Flows](#10-operational-flows)
11. [Database (Supabase)](#11-database-supabase)
12. [API Reference](#12-api-reference)
13. [Environment Variables](#13-environment-variables)
14. [Deployment](#14-deployment)
15. [Project Structure](#15-project-structure)
16. [Security Checklist](#16-security-checklist)
17. [Related Documents](#17-related-documents)

---

## 1. System Overview

**PATROLLERS** is PRO4A’s field patrol monitoring and dispatch-assist platform. It gives command centers a live map of patrol units and gives field patrollers a dedicated Android app for GPS reporting and incident response.

| User | Application | Login method |
|------|-------------|--------------|
| **Field patroller** | PATROLLERS Android app | Access token (`PATROLLERS-XXXXXXXX`) |
| **Command center operator** (RCC / PCC / SCC) | PATROLLERS web monitor | Email + password |
| **System administrator** | PATROLLERS web monitor | Email + password |
| **Regional / provincial chiefs** | PRO4A-COMMAND web dashboard | Access key (separate system) |

**Important:** Command center login and mobile login are completely separate. Chiefs do **not** log into PATROLLERS directly — they view patrol summaries through **PRO4A-COMMAND**.

---

## 2. Three Applications, One Ecosystem

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         PRO4A-COMMAND (Executive Layer)                      │
│   Chiefs & senior staff — patrol unit counts, personnel on duty, snapshot    │
│   Does NOT show live map. Links to PATROLLERS for full operational view.     │
└───────────────────────────────┬─────────────────────────────────────────────┘
                                │  HTTPS API (shared secret key)
                                │  GET /api/monitor/patrol-unit-counts
                                ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    PATROLLERS Web (Operational Command Layer)                │
│   RCC / PCC / SCC operators — live map, dispatch, force location, settings   │
└───────────────────────────────┬─────────────────────────────────────────────┘
                                │  Supabase Realtime + REST APIs
                                ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    PATROLLERS Android App (Field Layer)                      │
│   Patrollers — GPS tracking, profile, dispatch alerts, status updates        │
└─────────────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
                         Supabase PostgreSQL
                    (shared database for all layers)
```

| Layer | Who uses it | What they see |
|-------|-------------|---------------|
| **Field** | Patrollers on duty | Their own tracking, dispatch alerts, navigation |
| **Operational** | Command center staff | Full live map, all units, incident dispatch |
| **Executive** | Chiefs via PRO4A-COMMAND | Total active units by type, personnel on duty |

---

## 3. Architecture

### Tech stack

| Layer | Technology |
|-------|------------|
| Web app | Next.js 15 (App Router), React 19, JavaScript |
| Styling | Tailwind CSS 4 |
| Map | Leaflet / react-leaflet |
| Database | Supabase PostgreSQL + Realtime |
| Mobile app | Flutter (Android APK, separate repo) |
| Push notifications | Firebase Cloud Messaging (FCM) |
| Routing | OSRM (default) or Google Directions API |
| Hosting | Vercel (auto-deploy from GitHub `main`) |

### Data flow principle

Mobile GPS pings go **directly to Supabase** via the `insert_mobile_location` RPC — not through Vercel on every ping. This keeps the system scalable when many patrol units are active.

---

## 4. Mobile Android App — Setup & Daily Use

The PATROLLERS mobile app is a **Flutter Android APK** installed on duty phones. Each phone is bound to **one access token** issued by a System Administrator.

### 4.1 First-time setup (patroller + admin)

**Administrator side:**

1. Sign in to PATROLLERS web as **System Administrator**
2. Open **Access Tokens** in the menu bar
3. Click **Create Token** — enter a label (e.g. `Alpha Mobile 1 - Cavite`)
4. Share the token with the patroller via **QR code** or copy/paste
5. Install the PATROLLERS APK on the duty phone (first install is manual; later updates can be pushed via OTA settings)

**Patroller side:**

1. Open the PATROLLERS app on the Android phone
2. **Enter access token** or tap **Scan QR Code**
3. App validates token → `POST /api/mobile/token/validate`
4. Fill in **vehicle profile**:
   - Mobile plate number
   - Radio call sign
   - Office / unit
   - Personnel on board (rank, name, mobile number, on-duty flag)
5. App registers for push notifications → `POST /api/mobile/fcm-token`
6. Grant **location permission** when prompted (required for tracking)

**Rule:** One token = one phone = one profile. Do not share tokens between devices.

### 4.2 Starting a patrol shift

1. Open the app (token already saved from setup)
2. Set **Patrol Status**:
   - **Police Visibility** — normal patrol (default)
   - **On Incident Response** — active incident (marker turns red on command map)
3. Turn **Live Tracking ON**
4. App sends GPS to Supabase every **~3 minutes** (configurable by System Administrator)
5. App sends a **heartbeat** every ~60 seconds for online presence
6. Unit appears on the command center map

### 4.3 During operations — dispatch alerts

When command center dispatches the unit to an incident:

1. Phone receives **FCM push notification** + **Supabase Realtime broadcast**
2. Dispatch card appears with incident details and siren alert
3. Patroller chooses:
   - **Accept** — confirms response; command center sees acknowledgment
   - **Decline** — rejects dispatch with reason
4. After accepting, patroller can open **turn-by-turn navigation** to the incident
5. Tap **Arrived** when on scene — command center updates dispatch status

### 4.4 Force location (command-initiated)

Command center can request a fresh GPS fix without waiting for the next interval:

- **Silent mode** — phone auto-sends GPS in background
- **Alarm mode** — phone prompts patroller to confirm

Patroller does not need to take action in silent mode if tracking is already ON.

### 4.5 Ending a patrol shift

1. Turn **Live Tracking OFF**
2. App sends a stop-tracking beacon (`tracking_active: false`)
3. Unit **disappears from the command center map**
4. Token remains valid for the next shift — no need to re-enter unless token was revoked

### 4.6 App updates (OTA)

System Administrator publishes new APK versions in **System Settings → Mobile app update (OTA)**.

- Mobile checks `GET /api/mobile/app-update` on launch
- If a newer version is available, an **Update** button appears
- Patroller taps once to download and install (same app ID, higher version code)

### 4.7 Mobile troubleshooting

| Problem | Likely cause | Action |
|---------|--------------|--------|
| Unit not on map | Tracking OFF or token deactivated | Turn tracking ON; check token status with admin |
| Dispatch not received | FCM not configured or app killed | Open app; ensure notification permission granted |
| "Invalid token" | Token revoked or deleted | Request new token from System Administrator |
| Stale position on map | No GPS / no mobile data | Check phone location and data connection |

---

## 5. Command Center (PATROLLERS Web)

**URL:** https://project-patrollers.vercel.app

### 5.1 Signing in

1. Open the URL in a desktop or laptop browser
2. Enter **email** and **password**
3. On success → live map dashboard loads
4. **Single-device rule:** if already signed in elsewhere, login is blocked with a warning. Sign out on the other device first.

### 5.2 Main features

| Feature | Menu / location | Purpose |
|---------|-----------------|---------|
| **Live map** | `/` (home) | All active patrol units, incident markers, dispatch routes |
| **Review Track** | `/track-review` | Historical patrol movement review |
| **System Settings** | `/system-settings` | GPS interval, routing, radius rings (role-dependent) |
| **Access Tokens** | `/access-tokens` | Create / deactivate / delete mobile tokens (Admin only) |

### 5.3 Map tools

- **Basemap picker** — switch map style (satellite, street, etc.)
- **View layers** — toggle patrol status list, legend, signal stats
- **Add Call Response** — place incident marker and dispatch units
- **Force Location** — request fresh GPS from selected units
- **Generate Report** — planned feature (coming soon)

### 5.4 Call response workflow

1. Search incident location (place search powered by OpenStreetMap)
2. Place incident marker — configurable radius rings show dispatch search area
3. Select nearest units → dispatch as **Primary** or **Cordon**
4. Monitor acknowledgment and arrival status on map
5. Close incident when resolved

---

## 6. PRO4A-COMMAND — Chief / Executive Monitoring

**URL:** https://pro4a-command.vercel.app  
**Repository:** `Rogie-Laura/PRO4A-COMMAND`

PRO4A-COMMAND is the **regional executive dashboard** for PRO4A leadership. It is separate from the operational PATROLLERS map but reads live patrol data from it.

### 6.1 What chiefs see

On the **Police Intervention** page, chiefs see:

| Metric | Description |
|--------|-------------|
| **Total patrolling** | All active field units currently on the map |
| **Personnel on duty** | Total personnel marked on-duty across all active units |
| **By unit type** | Breakdown: Mobile, MC, Beat, Bike patrolling |
| **Per-type on duty** | Personnel on duty count per patrol type |

This is a **snapshot dashboard** — not a live streaming map. Counts are fetched from PATROLLERS and cached until the chief presses **Refresh**.

### 6.2 What chiefs do NOT see on PRO4A-COMMAND

- Individual unit GPS positions on a map
- Incident dispatch details
- Access token management
- System settings

For operational detail, chiefs use the **Open Patrollers map** button which opens PATROLLERS in a new tab (requires their own command center login if they have an account).

### 6.3 Who should use which system

| Role | Primary tool | Why |
|------|-------------|-----|
| Field patroller | PATROLLERS Android app | GPS reporting, dispatch response |
| RCC / PCC / SCC operator | PATROLLERS web map | Live operations, dispatch, force location |
| System Administrator | PATROLLERS web (admin pages) | Tokens, full settings, APK releases |
| Regional Chief / executive staff | PRO4A-COMMAND | High-level patrol strength snapshot |

---

## 7. How PATROLLERS Connects to PRO4A-COMMAND

### 7.1 Connection diagram

```
PRO4A-COMMAND                          PATROLLERS
(Police Intervention page)             (Supabase + Vercel API)
        │                                       │
        │  GET /api/monitor/patrol-unit-counts  │
        │  Header: X-Patrollers-Api-Key: ***    │
        ├──────────────────────────────────────►│
        │                                       │
        │                              RPC: get_monitor_patrol_snapshot
        │                              Filter: tracking_active = true
        │                              Count by patrol_unit_type
        │                                       │
        │◄──────────────────────────────────────┤
        │  JSON: { counts, duty_counts,         │
        │          total, duty_total, types }   │
        │                                       │
        ▼
  Display on dashboard
  (cached until Refresh pressed)
```

### 7.2 API endpoint

**PATROLLERS exposes:**

```
GET https://project-patrollers.vercel.app/api/monitor/patrol-unit-counts
```

**Authentication:** shared secret via header (either works):
- `X-Patrollers-Api-Key: <secret>`
- `Authorization: Bearer <secret>`

**Response example:**

```json
{
  "ok": true,
  "total": 12,
  "duty_total": 28,
  "counts": {
    "mobile_patrol": 5,
    "motorcycle_patrol": 4,
    "beat_patrol": 2,
    "bike_patrol": 1
  },
  "duty_counts": {
    "mobile_patrol": 12,
    "motorcycle_patrol": 10,
    "beat_patrol": 4,
    "bike_patrol": 2
  },
  "types": [
    { "id": "mobile_patrol", "label": "Mobile Patrolling" },
    { "id": "motorcycle_patrol", "label": "MC Patrolling" },
    { "id": "beat_patrol", "label": "Beat Patrolling" },
    { "id": "bike_patrol", "label": "Bike Patrolling" }
  ],
  "updated_at": "2026-06-13T10:30:00.000Z"
}
```

**Implementation files:**
- PATROLLERS: `app/api/monitor/patrol-unit-counts/route.js`
- PRO4A-COMMAND: `lib/patrollers-counts.ts`, `lib/patrol-intervention-analytics.ts`
- PRO4A-COMMAND UI: `components/dashboard/police-intervention-content.tsx`

### 7.3 Environment variables (both projects must match)

| PATROLLERS (Vercel) | PRO4A-COMMAND (Vercel) | Purpose |
|---------------------|------------------------|---------|
| `PATROLLERS_COMMAND_API_KEY=abc123...` | `PATROLLERS_COUNTS_API_KEY=abc123...` | Shared secret (same value) |
| — | `PATROLLERS_API_URL=https://project-patrollers.vercel.app` | Where to fetch counts |
| — | `NEXT_PUBLIC_PATROLLERS_URL=https://project-patrollers.vercel.app` | "Open Patrollers map" link |

**Security:** The counts API does not expose individual GPS coordinates, passwords, or tokens — only aggregate unit counts and personnel totals.

### 7.4 Caching behavior

PRO4A-COMMAND caches patrol counts using Next.js `unstable_cache` with `revalidate: false`. This means:

- Counts load **once** when the chief opens Police Intervention
- They **do not auto-refresh** while browsing other pages
- Chief presses **Refresh** to pull a new snapshot from PATROLLERS
- This is intentional — reduces load and matches the "executive snapshot" use case

Operational staff on the PATROLLERS map see **real-time** updates via Supabase Realtime.

### 7.5 What counts as "active"

A unit is included in PRO4A-COMMAND counts only when:

1. Access token is **active** (not deactivated/deleted)
2. Mobile app has **Live Tracking ON** (`tracking_active !== false`)
3. Unit appears in `get_monitor_patrol_snapshot` RPC result

Units with tracking OFF are excluded from chief dashboard totals.

---

## 8. Authentication & Security

### 8.1 Command center login

| Item | Detail |
|------|--------|
| Table | `public."user"` |
| API | `POST /api/auth/login` |
| Session | UUID stored in `user.session` |
| Cookie | `patrol_session` (httpOnly, 12 hours, secure in production) |
| Password | scrypt hash — `lib/auth/password.js` |
| Logout | `POST /api/auth/logout` — clears session |

### 8.2 Single-device session

Only **one active session per account**. Login from a second device (e.g. incognito) is rejected:

```
HTTP 409 — "Your account is currently logged in on another device.
            Please sign out on that device before signing in here."
```

- Same device (matching cookie) can re-authenticate
- Session expires after **12 hours** if not signed out
- Logic: `lib/auth/sessionPolicy.js`

### 8.3 Mobile access tokens

| Item | Detail |
|------|--------|
| Format | `PATROLLERS-XXXXXXXX` |
| Rule | 1 token = 1 phone = 1 profile |
| Auth | `Authorization: Bearer PATROLLERS-...` |
| Management | System Administrator only — `/access-tokens` |

### 8.4 PRO4A-COMMAND API key

The patrol counts endpoint requires a shared secret in production. Without it, the endpoint returns HTTP 503. This prevents public scraping of operational strength data.

---

## 9. Roles & Permissions

| Role | Command map | Settings | Access tokens |
|------|-------------|----------|---------------|
| **System Administrator** | Full | All settings | Create / delete |
| **RCC** | Full | Response radius circles only | No |
| **PCC** | Full | Response radius circles only | No |
| **SCC** | Full | Response radius circles only | No |
| **Patroller** | No (mobile only) | No | No |

Legacy role mapping: `phq` → PCC, `stn` → SCC

---

## 10. Operational Flows

### 10.1 End-to-end: field to chief visibility

```
1. Admin creates access token
2. Patroller installs app, enters token, fills profile
3. Patroller turns Live Tracking ON
4. GPS → Supabase → PATROLLERS map updates (Realtime)
5. PRO4A-COMMAND chief opens Police Intervention → Refresh
6. Chief sees updated unit counts and personnel on duty
```

### 10.2 Incident dispatch flow

```
1. Operator creates call response on PATROLLERS map
2. Dispatches nearest units (primary / cordon)
3. Mobile receives FCM + Realtime alert
4. Patroller accepts → navigates → marks arrived
5. Operator closes incident
```

### 10.3 Force location flow

```
1. Operator selects units in Force Location panel
2. POST /api/monitor/location-requests (silent or alarm)
3. Mobile sends fresh GPS
4. Map updates immediately
```

---

## 11. Database (Supabase)

### Main tables

| Table | Purpose |
|-------|---------|
| `"user"` | Command center accounts |
| `access_tokens` | Mobile device tokens |
| `mobile_device_profiles` | Vehicle/unit profile per token |
| `location_updates` | GPS history and live positions |
| `system_settings` | Singleton config row |
| `call_responses` | Incident markers |
| `call_response_dispatches` | Per-unit dispatch records |
| `location_request_batches` | Force-location requests |
| `mobile_fcm_tokens` | Push notification registration |

### Key RPC functions

| RPC | Used by |
|-----|---------|
| `insert_mobile_location` | Mobile app — GPS insert |
| `get_monitor_patrol_snapshot` | Command map + PRO4A-COMMAND counts API |
| `get_mobile_dispatches` | Mobile — pending dispatches |
| `respond_mobile_dispatch` | Mobile — accept/decline/arrive |
| `record_mobile_heartbeat` | Mobile — presence ping |
| `upsert_mobile_fcm_token` | Mobile — FCM registration |

Migrations are in `supabase/migrations/` (001 through 039). Apply via Supabase SQL Editor.

---

## 12. API Reference

### Auth
| Method | Route |
|--------|-------|
| POST | `/api/auth/login` |
| POST | `/api/auth/logout` |
| GET | `/api/auth/me` |

### Monitor (session required)
| Method | Route |
|--------|-------|
| GET | `/api/monitor/locations` |
| GET/POST | `/api/monitor/location-requests` |
| GET | `/api/monitor/patrol-unit-counts` ← **PRO4A-COMMAND** |

### Admin (role-restricted)
| Method | Route |
|--------|-------|
| GET/PATCH | `/api/admin/system-settings` |
| GET/POST | `/api/admin/access-tokens` |
| PATCH/DELETE | `/api/admin/access-tokens/[id]` |

### Call response
| Method | Route |
|--------|-------|
| GET/POST | `/api/call-responses` |
| PATCH | `/api/call-responses/[id]` |
| GET/POST | `/api/call-responses/[id]/dispatch` |

### Mobile (access token auth)
| Method | Route |
|--------|-------|
| POST | `/api/mobile/token/validate` |
| GET/PUT | `/api/mobile/profile` |
| POST | `/api/mobile/location` |
| POST | `/api/mobile/heartbeat` |
| GET | `/api/mobile/dispatch` |
| PATCH | `/api/mobile/dispatch/[id]` |
| POST | `/api/mobile/fcm-token` |
| GET | `/api/mobile/app-update` |

### Map / routing
| Method | Route |
|--------|-------|
| GET | `/api/places/search` |
| GET/POST | `/api/route/directions` |
| POST | `/api/incident/cordon` |
| GET | `/api/system-settings/map` |

---

## 13. Environment Variables

### PATROLLERS (`.env.local` / Vercel)

| Variable | Required | Purpose |
|----------|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Browser Supabase client |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Server admin access |
| `PATROLLERS_COMMAND_API_KEY` | Prod | Shared secret for PRO4A-COMMAND |
| `GOOGLE_MAPS_API_KEY` | Optional | Google Directions routing |
| `FIREBASE_PROJECT_ID` | Optional | FCM push |
| `FIREBASE_CLIENT_EMAIL` | Optional | FCM service account |
| `FIREBASE_PRIVATE_KEY` | Optional | FCM private key |
| `MOBILE_LOCATION_INTERVAL_MINUTES` | Optional | Default GPS interval (3 min) |

### PRO4A-COMMAND (Vercel)

| Variable | Required | Purpose |
|----------|----------|---------|
| `PATROLLERS_API_URL` | Yes | PATROLLERS base URL |
| `PATROLLERS_COUNTS_API_KEY` | Prod | Same value as `PATROLLERS_COMMAND_API_KEY` |
| `NEXT_PUBLIC_PATROLLERS_URL` | Optional | Link to open full PATROLLERS map |

---

## 14. Deployment

### Local development

```bash
cd project-PATROLLERS
npm install
copy .env.example .env.local   # Windows
npm run dev
# Open http://localhost:3000
```

### Production

1. Push to GitHub `main` branch
2. Vercel auto-deploys both PATROLLERS and PRO4A-COMMAND
3. Set all environment variables in each Vercel project
4. Apply new Supabase migrations via SQL Editor when added

---

## 15. Project Structure

```
project-PATROLLERS/
├── app/                    # Pages and API routes
│   ├── page.js             # Login + live map dashboard
│   ├── system-settings/    # RBAC-gated settings
│   ├── access-tokens/      # Token management (Admin)
│   └── api/                # All server endpoints
├── components/             # React UI
│   ├── MonitorDashboard.js # Command center shell
│   ├── PatrolMap.js        # Leaflet map
│   └── AccessTokensManager.js
├── lib/
│   ├── auth/               # session, password, roles, sessionPolicy
│   ├── mobile/             # accessToken, FCM, systemSettings
│   └── supabase/           # client + admin helpers
├── supabase/migrations/    # Database SQL (001–039)
└── docs/                   # This file and related docs
```

---

## 16. Security Checklist

| Control | Status |
|---------|--------|
| Password hashing (scrypt) | ✅ |
| Single-device session per account | ✅ |
| HttpOnly session cookie | ✅ |
| User table protected (RLS, service role only) | ✅ |
| Mobile: token auth, not shared passwords | ✅ |
| 1 token = 1 device profile | ✅ |
| API key on patrol counts endpoint | ✅ |
| Role-based settings access | ✅ |
| Access token deactivate / bulk delete | ✅ |
| PRO4A-COMMAND: counts only, no raw GPS exposed | ✅ |

---

## 17. Related Documents

| File | Content |
|------|---------|
| `docs/COMMAND_GROUP_PRESENTATION.md` | Command group pilot presentation |
| `docs/POST_PILOT_BACKLOG.md` | Version 2 roadmap |
| `.env.example` | Environment variable template |
| PRO4A-COMMAND repo | Executive dashboard implementation |

---

*Maintained for PRO4A PATROLLERS pilot. Update migration numbers and API list when the codebase changes.*
