export default function PatrolLoginCard({ title, subtitle, children }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-border/80 bg-card/95 shadow-2xl shadow-black/20 backdrop-blur-sm">
      <div className="h-1 bg-gradient-to-r from-accent/40 via-accent to-accent/40" />

      <div className="p-4 sm:p-6 md:p-7">
        {(title || subtitle) && (
          <div className="mb-6 text-center">
            {title && (
              <h2 className="text-lg font-semibold tracking-wide text-foreground">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="mt-1.5 text-sm text-muted">{subtitle}</p>
            )}
          </div>
        )}

        {children}
      </div>
    </section>
  );
}
