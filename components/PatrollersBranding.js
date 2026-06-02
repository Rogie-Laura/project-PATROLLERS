import Pro4aLogo from "@/components/Pro4aLogo";

const TAGLINE_WORDS = [
  { text: "Police", acronym: true },
  { text: "Activity", acronym: true },
  { text: "Tracking", acronym: true },
  { text: "and", acronym: false },
  { text: "Realtime", acronym: true },
  { text: "Operations", acronym: true },
  { text: "Live", acronym: true },
  { text: "Locator", acronym: true },
  { text: "and", acronym: false },
  { text: "Enhanced", acronym: true },
  { text: "Response", acronym: true },
  { text: "System", acronym: true },
];

function Tagline({ className = "" }) {
  return (
    <p className={`mx-auto max-w-sm leading-relaxed text-muted ${className}`}>
      {TAGLINE_WORDS.map((word, i) => (
        <span key={i}>
          {word.acronym ? (
            <>
              <span className="font-bold text-accent">{word.text[0]}</span>
              {word.text.slice(1)}
            </>
          ) : (
            word.text
          )}
          {i < TAGLINE_WORDS.length - 1 ? " " : ""}
        </span>
      ))}
    </p>
  );
}

export default function PatrollersBranding({ compact = false, inCard = false }) {
  return (
    <header
      className={`text-center ${inCard ? "mb-3" : compact ? "mb-4" : "mb-6"}`}
    >
      <Pro4aLogo size={inCard ? "xs" : compact ? "sm" : "md"} />

      <div
        className={
          inCard ? "mt-1.5 space-y-0.5" : compact ? "mt-3 space-y-1.5" : "mt-4 space-y-2"
        }
      >
        <h1
          className={`font-bold tracking-[0.15em] text-foreground ${
            inCard ? "text-base sm:text-lg" : compact ? "text-xl" : "text-2xl sm:text-3xl"
          }`}
        >
          PATROLLERS
        </h1>
        <Tagline
          className={
            inCard
              ? "text-[9px] leading-tight sm:text-[10px]"
              : compact
                ? "text-[11px]"
                : "text-xs sm:text-sm"
          }
        />
      </div>

      <div className="mx-auto mt-2 h-px w-12 bg-gradient-to-r from-transparent via-accent to-transparent" />
    </header>
  );
}
