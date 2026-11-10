import { redirect } from "next/navigation";

/** Owner settings now open inside the profile page. */
export default function OwnerSettingsPage() {
  redirect("/profile?tab=owner-settings");
}
