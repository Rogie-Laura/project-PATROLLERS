import Image from "next/image";

const TAGLINE = [
  { lead: "A", rest: "ccurate" },
  { lead: "A", rest: "ccessible" },
  { lead: "A", rest: "ctive" },
  { lead: "A", rest: "utomated" },
];

export default function Project4AFooter({ className = "", compact = false }) {
  return (
    <div
      className={`border-t border-border/60 text-center ${compact ? "pt-4" : "pt-6"} ${className}`}
    >
      <p className="text-sm font-bold tracking-[0.25em]">
        <span className="text-accent">PRO</span>
        <span className="text-foreground">JECT</span>
        <span className="text-accent">4A</span>
      </p>
      <p className={`text-[11px] leading-relaxed text-muted ${compact ? "mt-1.5" : "mt-2"}`}>
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
      <div
        className={`flex flex-col items-center ${compact ? "mt-2.5" : "mt-4"}`}
      >
        <Image
          src="/RICTMD.png"
          alt="RICTMD Logo"
          width={120}
          height={120}
          className="h-5 w-auto object-contain opacity-90"
        />
        <p className="mt-1.5 text-[10px] uppercase tracking-widest text-muted/70">
          Developed by RICTMD4A
        </p>
      </div>
    </div>
  );
}
