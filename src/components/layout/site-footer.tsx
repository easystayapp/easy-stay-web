import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-line max-md:pb-[76px]">
      <div className="container-page flex flex-wrap items-center gap-x-7 gap-y-3 py-7 text-[13px] text-muted-foreground">
        <span className="font-extrabold text-ink">EasyStay</span>
        <span>Find your stay. Connect directly.</span>
        <span className="flex-1" />
        <Link href="/about" className="text-muted-foreground hover:text-ink">About</Link>
        <Link href="/terms" className="text-muted-foreground hover:text-ink">Terms</Link>
        <Link href="/privacy" className="text-muted-foreground hover:text-ink">Privacy</Link>
        <Link href="/help" className="text-muted-foreground hover:text-ink">Help</Link>
      </div>
    </footer>
  );
}
