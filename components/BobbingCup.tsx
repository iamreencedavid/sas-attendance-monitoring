import Image from "next/image";
import cup from "@/public/brand/cup.png";

/** The cup mascot, gently bobbing (still under reduced motion). Decorative: pair it with text. */
export function BobbingCup({ className = "size-18" }: { className?: string }) {
  return <Image src={cup} alt="" priority className={`animate-cup-bob ${className}`} />;
}
