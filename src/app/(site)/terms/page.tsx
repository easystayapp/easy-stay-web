import { ContentPage, contentMetadata } from "@/components/content/content-page";

/** Text lives in the database (pages/terms); edits show up within a minute. */
export const revalidate = 60;

export const generateMetadata = () => contentMetadata("terms");

export default function TermsPage() {
  return <ContentPage slug="terms" />;
}
