import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-8 shadow-xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-accent/20 text-3xl">
            📍
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Patrollers</h1>
          <p className="mt-2 text-muted">
            Real-time patrol location monitoring system
          </p>
        </div>

        <div className="flex flex-col gap-4">
          <Link
            href="/patrol"
            className="flex items-center justify-between rounded-xl border border-border bg-background px-5 py-4 transition hover:border-accent hover:bg-accent/5"
          >
            <div>
              <p className="font-semibold">Patrol Login</p>
              <p className="text-sm text-muted">
                Mobile browser — send your location
              </p>
            </div>
            <span className="text-xl">→</span>
          </Link>

          <Link
            href="/monitor"
            className="flex items-center justify-between rounded-xl border border-border bg-background px-5 py-4 transition hover:border-accent hover:bg-accent/5"
          >
            <div>
              <p className="font-semibold">Monitor Dashboard</p>
              <p className="text-sm text-muted">
                View all patrols on the map
              </p>
            </div>
            <span className="text-xl">→</span>
          </Link>
        </div>
      </div>
    </main>
  );
}
