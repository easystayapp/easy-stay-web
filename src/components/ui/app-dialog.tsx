"use client";

import { XIcon } from "lucide-react";
import { Dialog as DialogPrimitive } from "radix-ui";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { DialogDescription, DialogOverlay, DialogPortal, DialogTitle } from "./dialog";

/**
 * shadcn/Radix dialog laid out as the design's bottom sheet on phones and a
 * centred card on larger screens (contact sheet, login, confirmations).
 */
export function AppDialog({
  open,
  onClose,
  title,
  description,
  hideTitle,
  wide,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  hideTitle?: boolean;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogPortal>
        <DialogOverlay className="z-[60] bg-ink/45 backdrop-blur-[2px]" />
        <DialogPrimitive.Content
          className={cn(
            "fixed inset-x-0 bottom-0 z-[60] flex max-h-[92vh] flex-col overflow-y-auto rounded-t-[28px] bg-white px-[22px] pt-3 pb-7 text-foreground outline-none",
            "data-open:animate-in data-open:slide-in-from-bottom-8 data-closed:animate-out data-closed:fade-out-0",
            "md:inset-x-auto md:top-1/2 md:bottom-auto md:left-1/2 md:w-full md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-[28px] md:px-8 md:pt-7 md:pb-8 md:data-open:zoom-in-95 md:data-open:slide-in-from-bottom-0",
            wide ? "md:max-w-[560px]" : "md:max-w-[460px]",
          )}
        >
          <div aria-hidden className="mx-auto mb-4 h-[5px] w-11 shrink-0 rounded-full bg-input md:hidden" />
          <div className={cn("flex items-start justify-between gap-4", hideTitle && "absolute top-5 right-5 md:top-6 md:right-6")}>
            <DialogTitle className={cn("text-xl font-extrabold", hideTitle && "sr-only")}>{title}</DialogTitle>
            <DialogPrimitive.Close
              aria-label="Close"
              className="hidden size-10 shrink-0 items-center justify-center rounded-xl border-[1.5px] border-border text-foreground hover:border-input md:flex"
            >
              <XIcon aria-hidden className="size-[18px]" />
            </DialogPrimitive.Close>
          </div>
          {description ? (
            <DialogDescription className="mt-1 text-[13px] text-muted-foreground">{description}</DialogDescription>
          ) : (
            <DialogDescription className="sr-only">{title}</DialogDescription>
          )}
          {children}
        </DialogPrimitive.Content>
      </DialogPortal>
    </DialogPrimitive.Root>
  );
}
