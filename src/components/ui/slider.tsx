"use client";

import { Slider as SliderPrimitive } from "radix-ui";
import { cx } from "@/lib/client/cx";

/** Themed Radix slider; one thumb per value (pass two for a range). */
export function Slider({ className, value, defaultValue, thumbLabels, ...props }: React.ComponentProps<typeof SliderPrimitive.Root> & { thumbLabels?: string[] }) {
  const count = (value ?? defaultValue ?? [0]).length;
  return (
    <SliderPrimitive.Root
      value={value}
      defaultValue={defaultValue}
      className={cx("relative flex h-6 w-full touch-none items-center select-none data-[disabled]:opacity-50", className)}
      {...props}
    >
      <SliderPrimitive.Track className="relative h-1.5 grow overflow-hidden rounded-full bg-line">
        <SliderPrimitive.Range className="absolute h-full rounded-full bg-brand" />
      </SliderPrimitive.Track>
      {Array.from({ length: count }, (_, i) => (
        <SliderPrimitive.Thumb
          key={i}
          aria-label={thumbLabels?.[i]}
          className="block size-5 rounded-full border-2 border-brand bg-white shadow-[0_2px_6px_rgba(30,27,31,0.2)] transition-transform outline-none hover:scale-110 focus-visible:ring-4 focus-visible:ring-brand/25 active:scale-95"
        />
      ))}
    </SliderPrimitive.Root>
  );
}
