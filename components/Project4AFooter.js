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
        className={`flex w-full flex-col items-center justify-center ${
          compact ? "mt-8 pt-2" : "mt-10 pt-2"
        }`}
      >
        <Image
          src="/RICTMD4A.png"
          alt="RICTMD Logo"
          width={120}
          height={120}
          className="mx-auto block h-[1.875rem] w-auto object-contain opacity-90"
        />
        <p className="mt-2 w-full text-center text-[10px] uppercase tracking-widest text-muted/70">
          Developed by RICTMD 4A
        </p>
      </div>
    </div>
  );
}
