import Image from "next/image";
import { ButtonLink } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-[440px] flex-col items-center justify-center gap-5 px-6 text-center">
      <Image src="/brand/logo-mark.png" alt="" width={72} height={64} className="h-auto w-[72px]" />
      <h1 className="text-[26px] font-extrabold tracking-tight">This page isn&apos;t here</h1>
      <p className="text-[15px] text-muted-foreground">The link may be old, or the listing may have been removed.</p>
      <ButtonLink href="/" size="lg">Back to EasyStay</ButtonLink>
    </main>
  );
}
