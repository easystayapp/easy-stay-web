"use client";

import { RequireOwner } from "@/components/auth/guards";
import { MyListingsSection } from "@/components/profile/my-listings-section";

export default function MyListingsPage() {
  return <RequireOwner>{(me) => <MyListingsSection me={me} />}</RequireOwner>;
}
