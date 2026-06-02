const TAGLINE = [
  { lead: "A", rest: "ccurate" },
  { lead: "A", rest: "ccessible" },
  { lead: "A", rest: "ctive" },
  { lead: "A", rest: "utomated" },
];

export default function Project4AFooter({ className = "" }) {
  return (
    <div
      className={`border-t border-border/60 pt-6 text-center ${className}`}
    >
      <p className="text-sm font-bold tracking-[0.25em] text-accent">
        PROJECT4A
      </p>
      <p className="mt-2 text-[11px] leading-relaxed text-muted">
        {TAGLINE.map((word, index) => (
          <span key={word.rest}>
            <span className="font-medium text-accent/90">{word.lead}</span>
            {word.rest}
            {index < TAGLINE.length - 1 ? (
              <>
                {" "}
                <span className="text-border">·</span>{" "}
              </>
            ) : null}
          </span>
        ))}
      </p>
      <p className="mt-4 text-[10px] uppercase tracking-widest text-muted/70">
        Developed by RICTMD4A
      </p>
    </div>
  );
}
