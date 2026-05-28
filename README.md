# Patrollers — Patrol Location Monitoring

Real-time patrol monitoring web app. Patrols log in from their **mobile browser** and send GPS coordinates. Supervisors view all patrols on a **Leaflet map** dashboard.

## Tech Stack

- **Next.js 15** (App Router) — Vercel-ready
- **React + JavaScript**
- **Leaflet / react-leaflet** — interactive map
- **Supabase** — auth, PostgreSQL database, realtime updates
- **Tailwind CSS** — UI styling

## Project Structure

```
project-PATROLLERS/
├── app/
│   ├── page.js          # Home — links to Patrol & Monitor
│   ├── patrol/page.js   # Mobile patrol login + GPS sender
│   └── monitor/page.js  # Live map dashboard
├── components/
│   └── PatrolMap.js     # Leaflet map with patrol markers
├── lib/supabase/        # Supabase client helpers
└── supabase/migrations/ # Database schema SQL
```

## Setup (Step by Step)

### 1. Install dependencies

```bash
cd "C:\Users\Project Developer\Documents\projects\project-PATROLLERS"
npm install
```

### 2. Create Supabase project

1. Go to [supabase.com](https://supabase.com) → **New Project**
2. Copy your **Project URL** and **anon public key** from Settings → API

### 3. Run database migration

1. Supabase Dashboard → **SQL Editor** → New query
2. Paste contents of `supabase/migrations/001_initial_schema.sql`
3. Click **Run**

### 4. Enable Realtime (if not auto-enabled)

1. Supabase Dashboard → **Database** → **Replication**
2. Enable replication for `location_updates` table

### 5. Create patrol users

1. Supabase Dashboard → **Authentication** → **Users** → **Add user**
2. Create accounts for each patrol (email + password)
3. Optional: set `full_name` in user metadata

### 6. Environment variables

Copy `.env.example` to `.env.local` and fill in values:

```bash
copy .env.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

### 7. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

- **Patrol Login** → `/patrol` — for mobile phones
- **Monitor Dashboard** → `/monitor` — live map (sign in with any Supabase user)

---

## Deploy to Vercel

1. Push project to GitHub (see below)
2. Go to [vercel.com](https://vercel.com) → **Add New Project**
3. Import your GitHub repo
4. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Deploy

> **Note:** GPS/location works on HTTPS (Vercel) and localhost. Mobile browsers require location permission.

---

## Push to GitHub

**Oo, pede natin diretso sa GitHub.** Sundin ang steps na ito:

### Option A — GitHub website (easiest)

1. Go to [github.com/new](https://github.com/new)
2. Repository name: `project-PATROLLERS` (or any name)
3. Keep it **Private** or **Public** — your choice
4. **Do NOT** add README, .gitignore, or license (meron na tayo)
5. Click **Create repository**
6. Sa terminal, sa project folder:

```bash
cd "C:\Users\Project Developer\Documents\projects\project-PATROLLERS"
git init
git add .
git commit -m "Initial commit: patrol monitoring app with Next.js, Leaflet, Supabase"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/project-PATROLLERS.git
git push -u origin main
```

Palitan ang `YOUR_USERNAME` ng GitHub username mo.

### Option B — GitHub Desktop

1. Download [GitHub Desktop](https://desktop.github.com/)
2. File → Add Local Repository → select `project-PATROLLERS` folder
3. Publish repository to GitHub

---

## How It Works

| Role | URL | Action |
|------|-----|--------|
| Patrol | `/patrol` | Login → Send location once or start live tracking |
| Monitor | `/monitor` | View all patrols on map (updates in realtime) |

Patrol sends `latitude`, `longitude`, and `accuracy` to Supabase. Monitor dashboard subscribes to realtime inserts and shows markers on the Leaflet map.

---

## License

Private / internal use.
