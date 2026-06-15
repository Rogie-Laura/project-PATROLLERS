# PATROLLERS — Dokumentasyon ng Implementasyon

**Project:** PRO4A PATROLLERS — Patrol Location Monitoring & Dispatch Assist  
**Live URL:** https://project-patrollers.vercel.app  
**Repository:** `Rogie-Laura/project-PATROLLERS`  
**Document version:** June 2026  

---

## 1. Ano ang PATROLLERS?

Ang **PATROLLERS** ay web-based **command center monitoring system** para sa Police Regional Office 4A (PRO4A). Ginagamit ito ng:

| User | Device | Purpose |
|------|--------|---------|
| **Command Center** (RCC / PCC / SCC / System Administrator) | Desktop/laptop browser | Live map, incident dispatch, settings |
| **Field Patrol** | Android mobile app | GPS tracking, dispatch alerts, profile |

**Hindi pareho ang login ng command center at mobile:**
- Command center → **email + password**
- Mobile patrol → **access token** (`PATROLLERS-XXXXXXXX`)

---

## 2. Tech Stack (Ano ang Ginamit)

| Layer | Technology | Bakit |
|-------|------------|-------|
| Web app | **Next.js 15** (App Router) + **React 19** | Full-stack sa isang repo; deploy sa Vercel |
| UI | **Taillet CSS 4** | Responsive command-center UI |
| Map | **Leaflet / react-leaflet** | Open-source map; maraming basemap options |
| Database | **Supabase PostgreSQL** | Data storage + Realtime updates |
| Server-side DB access | **Supabase Service Role** | Secure login, token validation, RPC calls |
| Mobile push | **Firebase Cloud Messaging (FCM)** | Dispatch alarm kapag naka-background ang app |
| Routing | **OSRM** (default) o **Google Directions** | ETA at turn-by-turn sa dispatch |
| Hosting | **Vercel** | Auto-deploy mula sa GitHub `main` branch |

---

## 3. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        COMMAND CENTER (Web Browser)                      │
│  Login (email/password) → Monitor Dashboard → Map / Dispatch / Settings   │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │
                    Next.js API Routes (Vercel)
                    lib/auth · lib/mobile · lib/supabase
                                │
        ┌───────────────────────┼───────────────────────┐
        ▼                       ▼                       ▼
  Supabase PostgreSQL    Supabase Realtime         Firebase FCM
  (user, tokens, GPS,   (live map updates)        (dispatch push)
   incidents, settings)
        ▲
        │
┌───────┴─────────────────────────────────────────────────────────────────┐
│                     MOBILE PATROL (Android App)                          │
│  Access Token → Profile → GPS every 3 min → Dispatch accept/arrive       │
└─────────────────────────────────────────────────────────────────────────┘
```

**Mahalagang prinsipyo:** Ang mobile app ay direktang kumokonekta sa Supabase para sa GPS insert (RPC), para hindi ma-overload ang Vercel sa bawat location ping.

---

## 4. Folder Structure (Saan Naka-code ang Ano)

```
project-PATROLLERS/
├── app/                          # Pages at API routes (Next.js App Router)
│   ├── page.js                   # / — Login + live map dashboard
│   ├── track-review/             # Historical patrol track review
│   ├── system-settings/          # Settings (RBAC by role)
│   ├── access-tokens/            # Mobile token management (Admin only)
│   └── api/                      # Lahat ng server endpoints
│       ├── auth/                 # login, logout, me
│       ├── admin/                # system-settings, access-tokens
│       ├── monitor/              # locations, location-requests, patrol counts
│       ├── mobile/               # mobile app APIs
│       └── call-responses/       # incident + dispatch
│
├── components/                   # React UI components
│   ├── MonitorDashboard.js       # Main command center shell
│   ├── PatrolMap.js              # Leaflet map + markers
│   ├── CallResponsePanel.js      # Incident dispatch panel
│   ├── SystemSettings.js         # Settings forms
│   ├── AccessTokensManager.js    # Token create/delete/QR
│   └── MapToolbar.js             # Navigation bar
│
├── lib/                          # Business logic (hindi UI)
│   ├── auth/                     # session, password, roles, sessionPolicy
│   ├── mobile/                   # accessToken, FCM, systemSettings
│   ├── supabase/                 # client.js (browser), admin.js (server)
│   └── ...                       # map helpers, dispatch, cordon, etc.
│
├── supabase/migrations/          # Database SQL migrations (001–039)
├── public/                       # Logos, patrol marker images
└── docs/                         # Documentation (including this file)
```

**Walang middleware file** — ang bawat page at API route ang nagve-verify ng auth nang hiwalay.

---

## 5. Authentication at Security

### 5.1 Command Center Login

| Item | Detalye |
|------|---------|
| **Table** | `public."user"` |
| **Login API** | `POST /api/auth/login` |
| **Session** | Random UUID na naka-save sa `user.session` |
| **Cookie** | `patrol_session` (httpOnly, 12 oras, secure sa production) |
| **Password** | **scrypt hash** (`lib/auth/password.js`) — hindi na plain text |
| **Logout** | `POST /api/auth/logout` — nililinis ang `session` at `session_started_at` |

**Files:**
- `app/api/auth/login/route.js`
- `app/api/auth/logout/route.js`
- `app/api/auth/me/route.js`
- `lib/auth/session.js`
- `lib/auth/password.js`

### 5.2 Single-Device Session (Security vs Erring Personnel)

**Isang active session lang per account.** Kapag naka-login na sa Device A at sinubukan mag-login sa Device B (hal. incognito):

```
HTTP 409 — "Your account is currently logged in on another device.
            Please sign out on that device before signing in here."
```

**Logic:** `lib/auth/sessionPolicy.js`
- May `session` sa DB → blocked ang bagong device
- Parehong device (same cookie) → pwedeng mag-re-login
- After **12 oras** (`SESSION_MAX_AGE`) → pwede nang mag-login sa bagong device kung hindi nag-logout
- Legacy session na walang `session_started_at` → treated as **active** (blocked)

**Database column:** `user.session_started_at` (migration `039_session_started_at.sql`)

### 5.3 Mobile Access Tokens

| Item | Detalye |
|------|---------|
| **Format** | `PATROLLERS-XXXXXXXX` (16 hex chars) |
| **Table** | `access_tokens` |
| **Rule** | **1 token = 1 phone = 1 profile** |
| **Auth header** | `Authorization: Bearer PATROLLERS-...` |
| **Management** | `/access-tokens` page — **System Administrator only** |

**Files:**
- `lib/mobile/accessToken.js`
- `app/api/admin/access-tokens/route.js`
- `components/AccessTokensManager.js`

### 5.4 Roles at Permissions (RBAC)

| Role | Command Center | Settings | Access Tokens |
|------|----------------|----------|---------------|
| **System Administrator** | ✅ Full | ✅ Lahat (GPS interval, routing, OTA, radius) | ✅ Create/Delete |
| **RCC** | ✅ Map, dispatch | ✅ **Radius circles lang** | ❌ |
| **PCC** | ✅ Map, dispatch | ✅ **Radius circles lang** | ❌ |
| **SCC** | ✅ Map, dispatch | ✅ **Radius circles lang** | ❌ |
| **Patroller** | ❌ | ❌ | ❌ |

**Legacy mapping:** `phq` → PCC, `stn` → SCC

**Files:**
- `lib/auth/roles.js`
- `lib/mobile/adminRoles.js`
- `app/api/admin/system-settings/route.js` (API-level restrictions)

---

## 6. Paano Gumagana — User Flows

### 6.1 Command Center Login Flow

```
1. Buksan ang https://project-patrollers.vercel.app
2. Mag-enter ng email + password
3. Server: verify password (scrypt) → check single-device policy
4. Kung OK: set session UUID + cookie → load MonitorDashboard
5. Kung may active session sa ibang device: amber warning, hindi papasok
```

### 6.2 Mobile Patrol Setup Flow

```
1. System Administrator → Access Tokens → Create Token
2. I-scan ang QR o i-copy ang token sa mobile app
3. Mobile: POST /api/mobile/token/validate
4. Mobile: PUT /api/mobile/profile (plate, unit, radio call sign, etc.)
5. Mobile: POST /api/mobile/fcm-token (para sa push notifications)
6. Patroller: i-ON ang Live Tracking
7. GPS → Supabase RPC insert_mobile_location (every ~3 minutes)
8. Command center: nakikita sa map via Realtime + polling backup
```

### 6.3 Call Response (Incident Dispatch) Flow

```
1. Operator: Add Call Response sa map (search lugar via Nominatim)
2. POST /api/call-responses → incident marker + radius rings
3. Piliin ang nearest units → POST /api/call-responses/[id]/dispatch
4. Server: gumawa ng dispatch records + FCM push + Realtime broadcast
5. Mobile: GET /api/mobile/dispatch → Accept / Decline
6. Mobile: POST /api/mobile/dispatch/[id]/directions → route guidance
7. Mobile: PATCH arrived → operator nakikita sa map
8. Operator: close incident → PATCH /api/call-responses/[id]
```

**Dispatch roles:** `primary` (main responder), `cordon` (perimeter)

### 6.4 Force Location Flow

```
1. Operator: piliin ang units sa Force Location panel
2. POST /api/monitor/location-requests (mode: silent o alarm)
3. Mobile: tumanggap ng FCM + Realtime → mag-send ng fresh GPS
4. Map: auto-update ang position
```

### 6.5 Access Token Lifecycle

```
Create  → POST /api/admin/access-tokens
Deactivate → PATCH /api/admin/access-tokens/[id] { is_active: false }
Reactivate → PATCH { is_active: true }
Delete (single/bulk) → DELETE /api/admin/access-tokens/[id]
```

---

## 7. Database Schema (Supabase)

### 7.1 Main Tables

| Table | Purpose |
|-------|---------|
| `"user"` | Command center accounts (email, password hash, role, session) |
| `access_tokens` | Mobile device tokens |
| `mobile_device_profiles` | Vehicle/unit info per token (1:1) |
| `location_updates` | GPS history at live positions |
| `system_settings` | Singleton config (interval, routing, radius rings, APK) |
| `call_responses` | Incidents / call-for-service markers |
| `call_response_dispatches` | Per-unit dispatch status |
| `location_request_batches` | Force-location requests |
| `mobile_fcm_tokens` | FCM registration per token |

### 7.2 Important RPC Functions (PostgreSQL)

| RPC | Ginagamit ng |
|-----|------------|
| `insert_mobile_location` | Mobile app — GPS insert |
| `get_monitor_patrol_snapshot` | Command center — latest positions |
| `get_mobile_dispatches` | Mobile — pending/active dispatches |
| `respond_mobile_dispatch` | Mobile — accept/decline/arrive |
| `record_mobile_heartbeat` | Mobile — presence (~60 sec) |
| `upsert_mobile_fcm_token` | Mobile — push registration |

### 7.3 Migrations

Lahat ng schema changes ay nasa `supabase/migrations/` — numbered `001` hanggang `039`.

**Important migrations:**
- `003` — user table + session
- `007` — access tokens + mobile profiles
- `014` — call responses
- `015` — mobile location RPC (scalable GPS)
- `037` — RCC/PCC/SCC roles
- `039` — session_started_at (single-device security)

**Paano i-apply:** Supabase Dashboard → SQL Editor → paste migration → Run  
*(O gamitin ang Supabase CLI kung naka-setup)*

---

## 8. API Routes (Complete List)

### Auth
| Method | Route | Purpose |
|--------|-------|---------|
| POST | `/api/auth/login` | Command center login |
| POST | `/api/auth/logout` | Sign out, clear session |
| GET | `/api/auth/me` | Current logged-in user |

### Monitor (Command Center — requires session)
| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/monitor/locations` | Live patrol positions |
| GET/POST | `/api/monitor/location-requests` | Force location |
| GET | `/api/monitor/patrol-unit-counts` | External API (PRO4A-COMMAND) |

### Admin (Role-restricted)
| Method | Route | Purpose |
|--------|-------|---------|
| GET/PATCH | `/api/admin/system-settings` | System configuration |
| GET/POST | `/api/admin/access-tokens` | List/create tokens |
| PATCH/DELETE | `/api/admin/access-tokens/[id]` | Deactivate/delete token |

### Call Response
| Method | Route | Purpose |
|--------|-------|---------|
| GET/POST | `/api/call-responses` | List/create incidents |
| PATCH | `/api/call-responses/[id]` | Close/cancel incident |
| GET/POST | `/api/call-responses/[id]/dispatch` | Dispatch units |

### Mobile (Access token auth)
| Method | Route | Purpose |
|--------|-------|---------|
| POST | `/api/mobile/token/validate` | Validate token |
| GET/PUT | `/api/mobile/profile` | Device profile |
| POST | `/api/mobile/location` | GPS insert (legacy/fallback) |
| POST | `/api/mobile/heartbeat` | Presence ping |
| GET | `/api/mobile/dispatch` | Pending dispatches |
| PATCH | `/api/mobile/dispatch/[id]` | Accept/decline/arrive |
| POST | `/api/mobile/fcm-token` | Register push token |
| GET | `/api/mobile/app-update` | OTA APK version check |

### Map / Routing
| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/places/search` | Place search (Nominatim) |
| GET/POST | `/api/route/directions` | OSRM or Google routing |
| POST | `/api/incident/cordon` | Cordon/dragnet planning |
| GET | `/api/system-settings/map` | Map config for logged-in users |

---

## 9. External Integrations

| Service | Purpose | Config |
|---------|---------|--------|
| **Supabase** | Database, Realtime, RPC | `NEXT_PUBLIC_SUPABASE_URL`, keys |
| **Firebase FCM** | Dispatch push notifications | `FIREBASE_*` env vars |
| **OSRM** | Free routing (default) | No key needed |
| **Google Directions** | Traffic-aware routing (optional) | `GOOGLE_MAPS_API_KEY` |
| **Nominatim** | Place search | No key (public OSM) |
| **Overpass API** | Cordon road network | No key |
| **PRO4A-COMMAND** | Reads patrol unit counts | `PATROLLERS_COMMAND_API_KEY` |

---

## 10. Environment Variables

Copy `.env.example` → `.env.local` para sa local dev. Sa Vercel, i-set ang same variables.

| Variable | Required | Purpose |
|----------|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Browser Supabase client |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Server admin (login, tokens, RPC) |
| `GOOGLE_MAPS_API_KEY` | Optional | Google Directions |
| `FIREBASE_PROJECT_ID` | Optional | FCM push |
| `FIREBASE_CLIENT_EMAIL` | Optional | FCM service account |
| `FIREBASE_PRIVATE_KEY` | Optional | FCM private key |
| `PATROLLERS_COMMAND_API_KEY` | Prod | Shared secret with PRO4A-COMMAND |
| `MOBILE_LOCATION_INTERVAL_MINUTES` | Optional | Default 3 min GPS interval |

---

## 11. Deployment

### Local Development
```bash
cd project-PATROLLERS
npm install
copy .env.example .env.local   # fill in Supabase keys
npm run dev
# Open http://localhost:3000
```

### Production (Vercel)
1. Push sa GitHub `main` branch
2. Vercel auto-deploys → https://project-patrollers.vercel.app
3. Siguraduhing naka-set ang lahat ng env vars sa Vercel dashboard
4. Supabase migrations: i-run manually sa SQL Editor kung may bagong migration

---

## 12. Realtime at Map Updates

Ang command center map ay gumagamit ng **dalawang paraan** para sa live updates:

1. **Supabase Realtime** — instant kapag may bagong `location_updates` insert
2. **Polling backup** — every 90 seconds via `GET /api/monitor/locations`

Kapag `tracking_active = false` ang mobile, **nawawala ang unit sa map** (stop-tracking beacon).

**Presence:** Heartbeat every ~60 sec updates `last_seen_at` sa `mobile_device_profiles` para sa connection quality indicator.

---

## 13. System Settings (Ano ang Naco-configure)

| Setting | Default | Sino ang pwede mag-edit |
|---------|---------|-------------------------|
| GPS interval | 3 minutes | System Administrator |
| Dispatch routing | OSRM | System Administrator |
| Response radius circles | 5 configurable rings | RCC / PCC / SCC / Admin |
| Mobile APK release (OTA) | Manual | System Administrator |
| Patrol default status | Police Visibility | Read-only display |

**Storage:** `system_settings` table, singleton row `id = 'default'`

---

## 14. Paano Gumawa ng Bagong Account

### Command Center User (manual sa Supabase)

```sql
-- Password hash dapat scrypt; mas madali: mag-login once gamit plain text
-- at auto-hash na ang system, O gumamit ng hash mula sa Node:
-- node -e "import { hashPassword } from './lib/auth/password.js'; console.log(hashPassword('YOUR_PASSWORD'));"

insert into public."user" (email, password, full_name, role, office, unit, badge_number)
values (
  'user@example.com',
  'PASTE_SCRYPT_HASH_HERE',
  'Full Name',
  'RCC',           -- RCC | PCC | SCC | System Administrator
  'PRO4A',
  'Unit Name',
  'BADGE001'
);
```

### Mobile Patrol Token
1. Login as **System Administrator**
2. Menu → **Access Tokens** → Create Token
3. I-share ang QR o token string sa patroller

---

## 15. Security Checklist (Public Safety)

| Control | Status |
|---------|--------|
| Password hashing (scrypt) | ✅ |
| Single-device session per account | ✅ |
| HttpOnly session cookie | ✅ |
| Service role only for user table (RLS, no public read) | ✅ |
| Mobile: token-based auth, not shared passwords | ✅ |
| 1 token = 1 device profile | ✅ |
| API key for external patrol counts endpoint | ✅ |
| Role-based settings access | ✅ |
| Access token deactivate/delete | ✅ |

---

## 16. Related Documentation

| File | Content |
|------|---------|
| `docs/COMMAND_GROUP_PRESENTATION.md` | Pilot presentation for command group |
| `docs/POST_PILOT_BACKLOG.md` | Version 2 roadmap |
| `.env.example` | Environment variable template |
| `supabase/SETUP_LOGIN.sql` | Manual login setup script |

---

## 17. Quick Reference — Sino ang Tumatawag sa Ano

```
Command Center Browser
    │
    ├─► /api/auth/*              → login/logout/session
    ├─► /api/monitor/*           → live map data, force location
    ├─► /api/call-responses/*   → incidents + dispatch
    ├─► /api/admin/*             → settings + tokens (role-gated)
    └─► Supabase Realtime       → instant map updates

Mobile Android App
    │
    ├─► Supabase RPC            → insert_mobile_location (direct GPS)
    ├─► /api/mobile/*           → profile, dispatch, heartbeat, FCM
    └─► Supabase Realtime       → instant dispatch broadcast

PRO4A-COMMAND (external)
    │
    └─► GET /api/monitor/patrol-unit-counts  (API key required)
```

---

*Maintained for PRO4A PATROLLERS pilot. Para sa updates sa codebase, i-sync ang migration numbers at API list sa dokumentong ito.*
