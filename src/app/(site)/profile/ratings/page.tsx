import { redirect } from "next/navigation";

/** My ratings now open inside the profile page. */
export default function MyRatingsPage() {
  redirect("/profile?tab=ratings");
}
