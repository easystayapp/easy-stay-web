/* eslint-disable @next/next/no-img-element -- photos come from user uploads on any storage host */
import { House } from "lucide-react";
import { cx } from "@/lib/client/cx";

const TINTS = [
  ["bg-tint-1", "text-brand"],
  ["bg-tint-2", "text-[#A0522D]"],
  ["bg-tint-3", "text-[#3D5A80]"],
] as const;

function tintFor(seed: string) {
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return TINTS[h % TINTS.length];
}

/** Listing photo, or a tinted placeholder when the listing has none yet. */
export function PropertyImage({
  src,
  alt,
  seed,
  className,
  iconSize = 32,
  priority,
}: {
  src: string | null | undefined;
  alt: string;
  seed: string;
  className?: string;
  iconSize?: number;
  priority?: boolean;
}) {
  if (src) {
    return (
      <img
        src={src}
        alt={alt}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        className={cx("object-cover", className)}
      />
    );
  }
  const [bg, fg] = tintFor(seed);
  return (
    <div role="img" aria-label={`${alt} (no photo yet)`} className={cx("flex items-center justify-center", bg, fg, className)}>
      <House aria-hidden style={{ width: iconSize, height: iconSize }} strokeWidth={1.4} />
    </div>
  );
}
