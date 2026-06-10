# PATROLLERS — Command Group Presentation

**Project:** PRO4A PATROLLERS — Patrol Location Monitoring & Dispatch Assist  
**Audience:** Command Group  
**Document version:** June 2026 (Pilot)  
**Live URL:** https://project-patrollers.vercel.app  

---

## 1. Situation

### 1.1 Operational context

Field patrol units operate across wide areas under **Police Regional Office 4A (PRO4A)**. Command centers need a **common operating picture**: where units are, whether they are actively on patrol, and how fast they can be directed to an incident.

Traditional methods rely on **radio calls**, **phone updates**, and **manual logs**. These work but have limits:

| Challenge | Impact on operations |
|-----------|----------------------|
| **Unknown unit location** | Slower dispatch; difficulty confirming who is nearest |
| **No live map** | Supervisor cannot see all patrols at once |
| **Delayed status updates** | Incident response vs. visibility patrol hard to distinguish |
| **Manual coordination** | More radio traffic; no shared record of dispatch status |

### 1.2 The gap

There is a need for a **simple, secure, map-based system** that:

- Shows **live patrol positions** on a command-center map  
- Supports **operational status** (e.g. Police Visibility, On Incident Response)  
- Enables **structured dispatch** to nearest or assigned units with **acknowledge** and **arrived** confirmation  
- Works on **standard Android duty phones** with minimal training  
- Runs on **reliable cloud infrastructure** suitable for pilot and scale-up  

### 1.3 PATROLLERS response

**PATROLLERS** is a **web-based command monitor** plus a **dedicated Android mobile app** for patrollers. It provides:

- GPS-based location reporting (default **every 3 minutes** while tracking is ON)  
- Real-time map updates at the command center  
- **Call response** workflow with dispatch assist (primary / cordon roles, route guidance)  
- **Access token** security — **one token bound to one phone**  
- Admin controls for intervals, map layers, and incident radius rings  

The system is in **pilot** — stable for demonstration and limited operational trial. A **Version 2** roadmap is defined for post-pilot approval.

---

## 2. Project Objectives

### 2.1 Primary objectives

| # | Objective | Pilot status |
|---|-----------|--------------|
| 1 | **Real-time patrol visibility** — See active units on a map with last update time and connection quality | ✅ Achieved |
| 2 | **Controlled mobile access** — Issue/revoke tokens; one device per patrol unit | ✅ Achieved |
| 3 | **Live tracking on/off** — Patroller starts/stops tracking; stop removes unit from map when beacon succeeds | ✅ Achieved |
| 4 | **Operational status** — Report Police Visibility / On Incident Response (and related states) | ✅ Achieved |
| 5 | **Incident dispatch assist** — Create call response, dispatch units, show route, track ack / arrived | ✅ Achieved |
| 6 | **Command-center usability** — Map tools, patrol list, filters, track review, system settings | ✅ Achieved |

### 2.2 Secondary objectives (post-pilot — Version 2)

| # | Objective | Target phase |
|---|-----------|--------------|
| 7 | **Instant dispatch alarm** (Realtime + FCM push when app in background) | V2 — P0 |
| 8 | **Online presence** separate from GPS (heartbeat ~60 sec) | V2 — P1 |
| 9 | **Force location** from command center (silent fresh GPS, batch progress) | V2 — P2 |
| 10 | **Auto-resend on network resume** + patroller warning when GPS/data off | V2 — P3 |
| 11 | **In-app OTA update** for fleet APK rollout | V2 — P5 |

### 2.3 Design principles (pilot rules)

- **1 access token = 1 phone** — prevents duplicate or shared logins on the map  
- **No breaking changes during pilot** — stable APK and database for ongoing trial  
- **GPS cadence separate from dispatch** — location every 3 min; dispatch polled every 60 sec (V2 will replace poll with Realtime/FCM)  
- **Patrol status on map** — Red marker only when patroller sets **On Incident Response**, not automatically on dispatch  

### 2.4 Success measures

| Measure | Pilot target |
|---------|----------------|
| Units visible on map while tracking ON | 100% of enrolled tokens |
| Location refresh interval | 3 minutes (configurable 30 sec – 24 hr in System Settings) |
| Dispatch flow | Alert → Acknowledge → Arrived recorded on monitor |
| System uptime | Cloud-hosted (Vercel + Supabase Pro) |
| Estimated operating cost | ~**₱4,000/month** (Supabase Pro + Vercel Pro + domain) at pilot scale |

---

## 3. Project Screenshots

> **Before presentation:** Capture live screenshots from pilot devices and the command monitor.  
> Save files in `docs/screenshots/` (create folder) and paste images into slides, or print this section.

### 3.1 Command center (web monitor)

| # | Screen | What to show | File name (suggested) |
|---|--------|--------------|------------------------|
| 1 | **Login page** | PRO4A branding, monitor sign-in | `01-monitor-login.png` |
| 2 | **Live map — overview** | Multiple patrol markers, CALABARZON map | `02-map-overview.png` |
| 3 | **Map connection legend** | Online / weak signal / delayed / no recent update | `03-map-legend.png` |
| 4 | **Patrol detail panel** | Unit name, last update, battery, network, status | `04-patrol-detail.png` |
| 5 | **Patrol status list** | Side panel with unit list and status dots | `05-patrol-status-list.png` |
| 6 | **Call response — create incident** | Incident marker on map with radius rings | `06-call-response-create.png` |
| 7 | **Dispatch assist panel** | Nearest units, Primary / Cordon dispatch buttons | `07-dispatch-assist.png` |
| 8 | **Dispatch route on map** | Turn-by-turn route line to incident | `08-dispatch-route.png` |
| 9 | **Track review** | Historical path of a unit for after-action review | `09-track-review.png` |
| 10 | **System settings** | GPS interval, radius rings, routing provider | `10-system-settings.png` |
| 11 | **Access tokens admin** | Create / deactivate mobile tokens | `11-access-tokens.png` |

**[ INSERT SCREENSHOT: 01-monitor-login.png ]**

**[ INSERT SCREENSHOT: 02-map-overview.png ]**

**[ INSERT SCREENSHOT: 07-dispatch-assist.png ]**

---

### 3.2 Mobile app (Android — patroller)

| # | Screen | What to show | File name (suggested) |
|---|--------|--------------|------------------------|
| 12 | **Token login / QR scan** | Access token entry | `12-mobile-login.png` |
| 13 | **Dashboard — tracking ON** | Live tracking active, interval label | `13-mobile-dashboard-tracking.png` |
| 14 | **Patrol status** | Police Visibility / On Incident Response | `14-mobile-status.png` |
| 15 | **Dispatch alarm** | Incoming dispatch card with siren | `15-mobile-dispatch-alert.png` |
| 16 | **Acknowledge / Arrived** | Dispatch response buttons | `16-mobile-dispatch-ack-arrived.png` |
| 17 | **Incident navigation** | Map/navigation to incident location | `17-mobile-navigation.png` |
| 18 | **Stop tracking** | End of shift — unit removed from monitor map | `18-mobile-stop-tracking.png` |

**[ INSERT SCREENSHOT: 13-mobile-dashboard-tracking.png ]**

**[ INSERT SCREENSHOT: 15-mobile-dispatch-alert.png ]**

---

### 3.3 Suggested demo flow (for live presentation)

1. Open **monitor** — show map with active units  
2. On **phone** — confirm **Live Tracking ON** and status **Police Visibility**  
3. Create **call response** on map → show radius rings  
4. **Dispatch** nearest unit as Primary → phone receives alert  
5. On phone — **Acknowledge** → **Arrived**  
6. Show **monitor** dispatch status and optional route on map  
7. Optional: open **Track Review** for movement history  

---

## 4. Timeline

### 4.1 Completed (pilot phase)

| Period | Milestone |
|--------|-----------|
| **Q1–Q2 2026** | Requirements, architecture (Next.js + Supabase + Flutter) |
| **2026** | Core GPS pipeline — `insert_mobile_location`, access tokens, monitor map |
| **2026** | Patrol status, device metrics (battery, signal), tracking on/off beacon |
| **2026** | Call response + dispatch assist (primary/cordon, ack, arrived, route) |
| **2026** | Connection UX — delayed/stale thresholds, map legend, monitor link labels |
| **2026** | Pilot deployment — Vercel production, Supabase Pro, stable APK |
| **June 2026** | Command group presentation & pilot validation |

### 4.2 Proposed — Version 2 (post-approval)

| Phase | Window (proposed) | Deliverables |
|-------|-------------------|--------------|
| **V2.0 — Dispatch & presence** | Months 1–2 | Supabase Realtime on mobile, FCM push, heartbeat, remove 60s dispatch poll |
| **V2.1 — Command tools** | Month 3 | Force location (single + batch), progress panel on monitor |
| **V2.2 — Field reliability** | Month 3–4 | GPS/data warning banner, auto-send on resume, retry failed sends |
| **V2.3 — Fleet ops** | Month 4 | OTA in-app update, retention cron (90-day GPS history prune) |
| **Scale-up** | Month 5+ | Expanded token count, training, SOP integration, optional LGU/security agency patterns |

### 4.3 Gantt summary (simplified)

```
2026 H1          │████████████████████│ Pilot live (current)
2026 H2 (plan)   │░░░░ V2.0 ░░░░│░░ V2.1 ░░│░░ V2.2–V2.3 ░░│
                 └─────────────────────────────────────────────►
                      ↑ Command approval gate
```

*Exact dates subject to command approval and resource allocation.*

---

## 5. Enhancement

### 5.1 Version 2 — priority enhancements

#### P0 — Public safety (dispatch)

- **Instant dispatch** via Supabase Realtime + **FCM** when app is background or closed  
- **Navigate immediately** on dispatch tap; sync status in background  
- **No change** to 3-minute GPS interval  

#### P1 — Online presence

- **Heartbeat every ~60 seconds** (`last_seen`) — separate from map position  
- Monitor shows **Online** vs **last GPS update** clearly  

#### P2 — Force location

- Command center requests **fresh GPS** silently (no siren)  
- **Batch mode** for many units with progress: Success / Failed / Pending  

#### P3 — Tracking reliability

- **Warning banner** on phone when GPS or data unavailable (no auto-logout)  
- **Auto location send** when signal returns  
- **Retry** failed timer sends  

#### P4 — Monitor polish

- Clear error banner after successful refresh  
- Scheduled **90-day** GPS history retention  

#### P5 — Mobile OTA update

- **One-tap APK update** from inside the app after admin publishes new version  

### 5.2 Connection status model (current pilot — for command awareness)

| Map indicator | Meaning |
|---------------|---------|
| **Blue border — Online** | Fresh GPS; good network at last send |
| **Orange — Online · weak signal** | Fresh GPS; slow network at last send (e.g. during Viber/data contention) |
| **Yellow — Update delayed** | Past expected interval; still on map |
| **Grey — No recent update** | No GPS for extended period — check phone / tracking |

### 5.3 Infrastructure & cost (scale reference)

| Item | Notes |
|------|--------|
| **Hosting** | Vercel Pro + Supabase Pro |
| **Pilot cost** | ~₱4,000/month |
| **FCM / Realtime add-on** | ~₱0 at pilot dispatch volume |
| **Scale** | 300+ units feasible with 90-day data retention and interval tuning |

### 5.4 Future considerations (beyond V2)

| Area | Possible enhancement |
|------|---------------------|
| **Integration** | eGov / regional crime reporting (read-only feeds) |
| **Hardware** | Body-worn camera link, ANPR checkpoint feeds |
| **Analytics** | Hotspot maps from track history, response time reports |
| **Training mode** | Sandbox map for academy / exercises |
| **Multi-region** | Separate PRO instances or filtered views per unit |

---

## Appendix A — Technology summary

| Layer | Technology |
|-------|------------|
| Command monitor | Next.js 15, React, Leaflet, Tailwind CSS |
| Mobile app | Flutter (Android APK) |
| Database & API | Supabase (PostgreSQL, RPC, Realtime) |
| Hosting | Vercel |
| Auth | Monitor: email login; Mobile: access tokens |

## Appendix B — Key URLs & access

| Role | Access |
|------|--------|
| Command monitor | https://project-patrollers.vercel.app |
| Mobile app | PATROLLERS APK (issued per access token) |
| Admin | System Settings, Access Tokens (admin role) |

## Appendix C — Presentation checklist

- [ ] Screenshots captured (Section 3)  
- [ ] Demo phones charged; tracking ON; tokens active  
- [ ] Monitor logged in; test incident coordinates ready  
- [ ] Backup: screen recording if live network fails  
- [ ] One-page handout optional (Objectives + Timeline + Contact)  

---

*Prepared for PRO4A Command Group — PATROLLERS Pilot Presentation.*
