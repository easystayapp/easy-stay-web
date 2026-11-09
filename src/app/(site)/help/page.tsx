import type { Metadata } from "next";
import { ProsePage } from "@/components/content/prose-page";

export const metadata: Metadata = { title: "Help" };

export default function HelpPage() {
  return (
    <ProsePage title="Help & support">
      <h2>Do I need an account to browse?</h2>
      <p>No. Search, filters and listing details are open to everyone. Log in only to contact an owner, save or rate.</p>
      <h2>How do I list my property?</h2>
      <p>
        Go to <b>List your property</b>, sign in and verify your mobile number to turn on owner tools. Then add your property —
        type, sharing, rent, location, 3–5 photos and who it&apos;s available for.
      </p>
      <h2>How long does a listing stay live?</h2>
      <p>15 days. We remind you 3 days and 1 day before it ends, and you can repost it in one tap — views and ratings are kept.</p>
      <h2 id="ratings">How do ratings work?</h2>
      <p>
        The combined rating is the average of Property, Owner, Environment, Value for money and Food (only where meals are
        served). Only people who contacted the owner through EasyStay can rate, once each, and can edit their rating anytime. A
        property shows &ldquo;New&rdquo; until it has 3 ratings.
      </p>
    </ProsePage>
  );
}
