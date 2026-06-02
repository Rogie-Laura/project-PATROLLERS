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
      className={`text-center ${inCard ? "mb-3 sm:mb-4" : compact ? "mb-4" : "mb-6"}`}
    >
      <Pro4aLogo
        size={inCard ? "xs" : compact ? "sm" : "md"}
        className={
          inCard ? "h-[3.75rem] w-auto sm:h-[4.75rem] md:h-20 lg:h-24" : ""
        }
      />

      <div
        className={
          inCard
            ? "mt-1.5 space-y-0.5 sm:mt-2 sm:space-y-1"
            : compact
              ? "mt-3 space-y-1.5"
              : "mt-4 space-y-2"
        }
      >
        <h1
          className={`font-bold tracking-[0.15em] text-foreground sm:tracking-[0.2em] ${
            inCard
              ? "text-base sm:text-xl md:text-2xl"
              : compact
                ? "text-xl"
                : "text-2xl sm:text-3xl"
          }`}
        >
          PATROLLERS
        </h1>
        <Tagline
          className={
            inCard
              ? "max-w-xs text-[9px] leading-tight sm:max-w-sm sm:text-[11px] md:text-xs"
              : compact
                ? "text-[11px]"
                : "text-xs sm:text-sm"
          }
        />
      </div>

      <div className="mx-auto mt-2 h-px w-12 bg-gradient-to-r from-transparent via-accent to-transparent sm:mt-3 sm:w-16" />
    </header>
  );
}
