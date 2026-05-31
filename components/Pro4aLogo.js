import Image from "next/image";

const heights = {
  sm: "5rem",
  md: "7rem",
  lg: "8rem",
};

export default function Pro4aLogo({ size = "md" }) {
  const height = heights[size] || heights.md;

  return (
    <div className="mx-auto inline-flex rounded-xl bg-white p-3 shadow-md ring-1 ring-black/5">
      <Image
        src="/PRO4A.png"
        alt="PRO4A Logo"
        width={284}
        height={318}
        className="object-contain"
        style={{ width: "auto", height }}
        priority
      />
    </div>
  );
}
