import Link from "next/link";
import PatrollersBranding from "@/components/PatrollersBranding";

export default function HomePage() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 py-10">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(34,197,94,0.12)_0%,_transparent_55%)]"
      />

      <div className="relative w-full max-w-lg rounded-2xl border border-border/80 bg-card/95 p-8 shadow-2xl shadow-black/20 backdrop-blur-sm">
        <div className="h-1 rounded-t-2xl bg-gradient-to-r from-accent/40 via-accent to-accent/40" />

        <div className="pt-2">
          <PatrollersBranding />

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
      </div>
    </main>
  );
}
