import { ContentPage, contentMetadata } from "@/components/content/content-page";

/** Text lives in the database (pages/help); edits show up within a minute. */
export const revalidate = 60;

export const generateMetadata = () => contentMetadata("help");

export default function HelpPage() {
  return <ContentPage slug="help" />;
}
