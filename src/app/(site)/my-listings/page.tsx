"use client";

import { RequireOwner } from "@/components/auth/guards";
import { MyListingsSection } from "@/components/profile/my-listings-section";
import { MyListingsSkeleton } from "@/components/ui/skeleton";

export default function MyListingsPage() {
  return <RequireOwner fallback={<MyListingsSkeleton />}>{(me) => <MyListingsSection me={me} />}</RequireOwner>;
}
