import { cx } from "@/lib/client/cx";

/** A pulsing placeholder block. Pulse is disabled for users who prefer reduced motion. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cx("animate-pulse rounded-lg bg-line-3 motion-reduce:animate-none", className)} />;
}

/** Wraps a skeleton layout: announces one "loading" status instead of every block. */
export function SkeletonRegion({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <div role="status" aria-busy="true" aria-live="polite" className={className}>
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

/* ------------------------------------------------------- property cards */

/** Mirrors <PropertyCard>: image, title row, locality, tags, rent. */
export function PropertyCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-[20px] border border-line bg-white">
      <Skeleton className="h-[180px] rounded-none" />
      <div className="flex flex-col gap-2.5 px-4 pt-3.5 pb-4">
        <div className="flex items-start justify-between gap-3">
          <Skeleton className="h-5 w-3/5" />
          <Skeleton className="h-5 w-10" />
        </div>
        <Skeleton className="h-3.5 w-2/5" />
        <Skeleton className="h-3 w-4/5" />
        <div className="flex items-baseline justify-between pt-1">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
    </div>
  );
}

export function PropertyGridSkeleton({ count = 6, label = "Loading properties" }: { count?: number; label?: string }) {
  return (
    <SkeletonRegion label={label} className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-5">
      {Array.from({ length: count }, (_, i) => (
        <PropertyCardSkeleton key={i} />
      ))}
    </SkeletonRegion>
  );
}

/** Whole results page (sidebar + grid) for the route-level Suspense fallback. */
export function ResultsPageSkeleton() {
  return (
    <div className="container-page grid gap-8 py-6 md:py-8 lg:grid-cols-[280px_1fr]">
      <aside className="hidden self-start rounded-[20px] border border-line p-5 lg:block">
        <Skeleton className="mb-6 h-6 w-24" />
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="mb-6 flex flex-col gap-3">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-12 w-full rounded-[14px]" />
          </div>
        ))}
      </aside>
      <section className="flex min-w-0 flex-col gap-5">
        <Skeleton className="hidden h-14 w-full rounded-full md:block" />
        <Skeleton className="h-9 w-72" />
        <PropertyGridSkeleton />
      </section>
    </div>
  );
}

/* ------------------------------------------------------- property detail */

export function PropertyDetailSkeleton() {
  return (
    <SkeletonRegion label="Loading property" className="container-page pb-32 md:py-6 md:pb-16">
      <Skeleton className="h-[260px] w-full rounded-[24px] md:h-[400px]" />
      <div className="mt-6 grid gap-10 md:mt-8 lg:grid-cols-[1fr_360px]">
        <div className="flex min-w-0 flex-col gap-8">
          <div className="flex flex-col gap-3">
            <div className="flex gap-2">
              <Skeleton className="h-6 w-28" />
              <Skeleton className="h-6 w-24" />
            </div>
            <Skeleton className="h-9 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-3.5 w-32" />
          </div>
          <Skeleton className="h-[120px] w-full rounded-2xl" />
          <div className="flex flex-col gap-3">
            <Skeleton className="h-6 w-32" />
            <div className="flex gap-2">
              <Skeleton className="h-10 w-24 rounded-full" />
              <Skeleton className="h-10 w-28 rounded-full" />
              <Skeleton className="h-10 w-20 rounded-full" />
            </div>
          </div>
          <div className="flex flex-col gap-2.5">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
          <Skeleton className="h-[220px] w-full rounded-2xl" />
        </div>
        <aside className="hidden lg:block">
          <div className="flex flex-col gap-4 rounded-[24px] border border-line p-6">
            <Skeleton className="h-9 w-40" />
            <Skeleton className="h-12 w-full rounded-xl" />
            <Skeleton className="h-[54px] w-full rounded-[14px]" />
            <Skeleton className="h-[54px] w-full rounded-[14px]" />
            <Skeleton className="h-[54px] w-full rounded-[14px]" />
          </div>
        </aside>
      </div>
    </SkeletonRegion>
  );
}

/* ----------------------------------------------------------------- lists */

/** Rows with a square thumbnail and two or three text lines (inbox, saved, listings). */
export function ListRowsSkeleton({ rows = 4, label = "Loading" }: { rows?: number; label?: string }) {
  return (
    <SkeletonRegion label={label} className="divide-y divide-line overflow-hidden rounded-[20px] border border-line">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex gap-3.5 px-4 py-3.5">
          <Skeleton className="size-14 shrink-0 rounded-xl" />
          <div className="flex flex-1 flex-col gap-2 pt-0.5">
            <div className="flex justify-between gap-3">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-8" />
            </div>
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-3.5 w-4/5" />
          </div>
        </div>
      ))}
    </SkeletonRegion>
  );
}

/** Stand-alone cards (reports, verification). */
export function CardListSkeleton({ rows = 3, label = "Loading" }: { rows?: number; label?: string }) {
  return (
    <SkeletonRegion label={label} className="flex flex-col gap-3">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex flex-col gap-3 rounded-[20px] border border-line p-4">
          <div className="flex justify-between gap-3">
            <Skeleton className="h-5 w-2/5" />
            <Skeleton className="h-6 w-20" />
          </div>
          <Skeleton className="h-3 w-3/5" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-4/5" />
        </div>
      ))}
    </SkeletonRegion>
  );
}

/** Chat thread: header, visit card and alternating bubbles. */
export function ThreadSkeleton() {
  const bubbles = ["w-3/5 self-end", "w-2/5 self-start", "w-1/2 self-end", "w-3/5 self-start"];
  return (
    <SkeletonRegion label="Loading conversation" className="container-page flex max-w-3xl flex-col gap-4 py-4 md:py-8">
      <div className="flex items-center gap-3">
        <Skeleton className="size-11 rounded-[14px]" />
        <Skeleton className="size-11 rounded-xl" />
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-44" />
        </div>
      </div>
      <Skeleton className="h-24 w-full rounded-[20px]" />
      <div className="flex flex-col gap-3 py-2">
        {bubbles.map((c) => (
          <Skeleton key={c} className={`h-12 rounded-[16px] ${c}`} />
        ))}
      </div>
    </SkeletonRegion>
  );
}
