import Image from "next/image";

export default function Pro4aLogo({ className = "h-28" }) {
  return (
    <div className="mx-auto inline-flex rounded-xl bg-white p-3 shadow-sm">
      <Image
        src="/PRO4A.png"
        alt="PRO4A Logo"
        width={284}
        height={318}
        className={`object-contain ${className}`}
        style={{ width: "auto", height: "7rem" }}
        priority
      />
    </div>
  );
}
