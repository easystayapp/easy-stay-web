"use client";

import { useEffect, useRef } from "react";

/**
 * Section that fades and rises into place the first time it scrolls into view.
 * Content that is already on screen (or when JS is off / reduced motion is set)
 * is never hidden, so nothing flashes or stays invisible.
 */
export function Reveal({
  children,
  className,
  delay = 0,
  ...rest
}: React.ComponentProps<"section"> & { delay?: number }) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (el.getBoundingClientRect().top < window.innerHeight * 0.9) return; // already visible
    el.dataset.reveal = "hidden";
    if (delay) el.style.transitionDelay = `${delay}ms`;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        el.dataset.reveal = "shown";
        io.disconnect();
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.05 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [delay]);

  return (
    <section ref={ref} className={className} {...rest}>
      {children}
    </section>
  );
}
