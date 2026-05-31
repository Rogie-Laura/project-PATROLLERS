import Image from "next/image";

export default function Pro4aLogo({ className = "h-24 w-auto" }) {
  return (
    <Image
      src="/PRO4A.png"
      alt="PRO4A Logo"
      width={240}
      height={240}
      className={`mx-auto object-contain ${className}`}
      priority
    />
  );
}
