# PRO4A PATROLLERS

Patrol location monitoring and dispatch-assist system for Police Regional Office 4A (PRO4A).

**Live:** https://project-patrollers.vercel.app

## Documentation

| Document | Description |
|----------|-------------|
| **[docs/PATROLLERS_IMPLEMENTATION.md](docs/PATROLLERS_IMPLEMENTATION.md)** | **Full implementation guide** — architecture, auth, flows, API, database, deployment |
| [docs/COMMAND_GROUP_PRESENTATION.md](docs/COMMAND_GROUP_PRESENTATION.md) | Command group pilot presentation |
| [docs/POST_PILOT_BACKLOG.md](docs/POST_PILOT_BACKLOG.md) | Version 2 roadmap |

## Quick Start

```bash
npm install
copy .env.example .env.local   # fill Supabase keys
npm run dev
```

Open http://localhost:3000 — command center login (email + password).

## Tech Stack

Next.js 15 · React 19 · Leaflet · Supabase · Tailwind CSS · Vercel

## License

Private / internal use — PRO4A.
