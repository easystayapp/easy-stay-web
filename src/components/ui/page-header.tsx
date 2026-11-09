import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

/** Back button + title + subtitle, as on the mobile sub-screens. */
export function PageHeader({
  back,
  title,
  subtitle,
  action,
}: {
  back?: string;
  title: string;
  subtitle?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3">
      {back && (
        <Link
          href={back}
          aria-label="Back"
          className="flex size-11 shrink-0 items-center justify-center rounded-[14px] border-[1.5px] border-line text-ink hover:border-line-2 hover:text-ink"
        >
          <ChevronLeft aria-hidden className="size-5" />
        </Link>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <h1 className="text-xl font-extrabold tracking-tight md:text-[28px]">{title}</h1>
        {subtitle && <span className="text-xs font-semibold text-muted-foreground md:text-sm">{subtitle}</span>}
      </div>
      {action}
    </div>
  );
}
