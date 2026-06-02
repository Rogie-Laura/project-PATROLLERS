import Image from "next/image";

const heights = {
  xs: "3.75rem",
  sm: "5rem",
  md: "7rem",
  lg: "8rem",
};

export default function Pro4aLogo({ size = "md", className = "" }) {
  const height = heights[size] || heights.md;

  return (
    <Image
      src="/PRO4A.png"
      alt="PRO4A Logo"
      width={284}
      height={318}
      className={`mx-auto object-contain drop-shadow-lg ${className}`}
      style={className ? { width: "auto" } : { width: "auto", height }}
      priority
    />
  );
}
