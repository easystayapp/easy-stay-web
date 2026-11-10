"use client";

import { RequireOwner } from "@/components/auth/guards";
import { NotificationsSection } from "@/components/profile/notifications-section";

export default function NotificationsPage() {
  return <RequireOwner>{() => <NotificationsSection />}</RequireOwner>;
}
