"use client";

import { useSyncExternalStore } from "react";
import { ownerHint } from "@/lib/client/prefs";
import { CardListSkeleton, MyListingsSkeleton, Skeleton, SkeletonRegion } from "./skeleton";

/*
 * Block sizes are measured from the real profile page (desktop):
 *   seeker "Profile": title 45, account card 106, banner 68, "own a property" card 83, rows 275
 *   owner  "Profile": title 45, account card 106, banner 68, "Owner settings" group 315, "Finding a place" group 299
 *   sidebar: 7 links (seeker) or 10 links (owner), 40px each
 */

const OWNER_ONLY = ["owner-settings", "listings", "notifications"];
const subscribe = () => () => {};

/** A rounded group of link rows. `heights` are the real row heights; the last row absorbs rounding. */
function RowsBox({ heights, total }: { heights: number[]; total: number }) {
  return (
    <div className="flex flex-col divide-y divide-line overflow-hidden rounded-[20px] border border-line" style={{ height: total }}>
      {heights.map((h, i) => {
        const last = i === heights.length - 1;
        return (
          <div key={i} className={last ? "flex min-h-0 flex-1 items-center gap-3.5 px-4" : "flex items-center gap-3.5 px-4"} style={last ? undefined : { height: h }}>
            <Skeleton className="size-5 shrink-0 rounded-md" />
            <div className="flex flex-col gap-1.5">
              <Skeleton className="h-4 w-40" />
              {h >= 60 && <Skeleton className="h-3 w-56 max-w-full" />}
            </div>
            <Skeleton className="ml-auto size-4 rounded-md" />
          </div>
        );
      })}
    </div>
  );
}

const Title = ({ children }: { children?: React.ReactNode }) => (
  <div className="flex h-[39px] items-center md:h-[45px]">{children ?? <Skeleton className="h-7 w-28" />}</div>
);

function AccountCard() {
  return (
    <div className="flex items-center gap-4 rounded-[22px] border border-line p-5">
      <Skeleton className="size-14 shrink-0 rounded-full" />
      <div className="flex h-16 flex-1 flex-col justify-center gap-2">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-3.5 w-32" />
        <Skeleton className="h-3 w-44" />
      </div>
      <Skeleton className="h-4 w-8 self-start" />
    </div>
  );
}

function RoleBanner() {
  return (
    <div className="flex min-h-[68px] flex-col justify-center gap-2 rounded-2xl bg-surface px-4">
      <Skeleton className="h-3 w-14 bg-white" />
      <Skeleton className="h-3.5 w-64 max-w-full bg-white" />
    </div>
  );
}

const Eyebrow = () => (
  <div className="flex h-4 items-center">
    <Skeleton className="h-3 w-24" />
  </div>
);

/** The "Profile" tab, as a seeker or an owner sees it. */
export function ProfileDetailsSkeleton({ owner = false }: { owner?: boolean }) {
  return (
    <div className="flex flex-col gap-6">
      <Title />
      <AccountCard />
      <RoleBanner />
      {owner ? (
        <>
          <div className="flex flex-col gap-2">
            <Eyebrow />
            <RowsBox heights={[52, 52, 68, 68, 51]} total={291} />
          </div>
          <div className="flex flex-col gap-2">
            <Eyebrow />
            <RowsBox heights={[52, 52, 52, 68, 51]} total={275} />
          </div>
        </>
      ) : (
        <>
          <div className="flex min-h-[83px] items-center gap-4 rounded-[20px] border-[1.5px] border-line p-4">
            <Skeleton className="size-12 shrink-0 rounded-[14px]" />
            <div className="flex flex-1 flex-col gap-2">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-3 w-full max-w-md" />
            </div>
          </div>
          <RowsBox heights={[55, 55, 55, 55, 55]} total={275} />
        </>
      )}
      <Skeleton className="h-[50px] w-full rounded-[14px] md:hidden" />
    </div>
  );
}

/**
 * Whole profile page while login is still loading: account side navigation beside the content of the
 * tab being opened. Whether the account is an owner isn't known yet, so it uses the last known state
 * of this device.
 */
export function ProfileSkeleton({ tab }: { tab?: string | null }) {
  const owner = useSyncExternalStore(subscribe, ownerHint, () => false);
  const current = tab && tab !== "details" && (owner || !OWNER_ONLY.includes(tab)) ? tab : "details";
  return (
    <SkeletonRegion label="Loading your profile" className="container-page grid gap-8 py-6 md:grid-cols-[260px_1fr] md:py-10">
      <div className="hidden self-start rounded-[22px] border border-line p-4 md:block">
        <div className="mb-4 flex items-center gap-3 border-b border-line pb-4">
          <Skeleton className="size-11 rounded-full" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-14" />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          {(owner ? [110, 120, 100, 104, 140, 128, 88, 124, 140, 64] : [110, 120, 128, 88, 124, 140, 64]).map((w, i) => (
            <div key={i} className="flex h-10 items-center px-3">
              <Skeleton className="h-4" style={{ width: w }} />
            </div>
          ))}
        </div>
      </div>
      <section className="min-w-0">
        {current !== "details" && <div className="mb-4 h-5 md:hidden" />}
        {current === "details" ? (
          <ProfileDetailsSkeleton owner={owner} />
        ) : current === "listings" ? (
          <MyListingsSkeleton embedded />
        ) : (
          <div className="flex flex-col gap-6">
            <Title />
            <CardListSkeleton rows={3} label="Loading" />
          </div>
        )}
      </section>
    </SkeletonRegion>
  );
}
