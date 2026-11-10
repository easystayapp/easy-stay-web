"use client";

import { Check, MessageCircle, Phone } from "lucide-react";
import { Button, buttonClass } from "@/components/ui/button";
import { AppDialog } from "@/components/ui/app-dialog";
import type { ContactInfo } from "@/types/api";
import { formatPhone } from "@/lib/domain/format";

/** 09 · Back on the property — message the owner on WhatsApp, or call. */
export function ContactSheet({
  info,
  canCall,
  canWhatsapp,
  onClose,
  onSwitch,
}: {
  info: ContactInfo;
  canCall: boolean;
  canWhatsapp: boolean;
  onClose: () => void;
  onSwitch: (channel: "call" | "whatsapp") => void;
}) {
  const wa = info.channel === "whatsapp";
  return (
    <AppDialog open onClose={onClose} title={wa ? "Message the owner" : "Call the owner"}>
      <div className="mt-3 flex flex-col gap-[18px]">
        <p className="-mt-1 text-[13px] text-muted-foreground">
          {wa ? "WhatsApp opens with this message ready to send." : `The owner's number is ${formatPhone(info.phone)}.`}
        </p>
        <p className="flex items-center gap-2 rounded-xl bg-ok-bg px-3 py-2.5 text-[13px] font-semibold text-ok">
          <Check aria-hidden className="size-4" strokeWidth={2.6} />
          You&apos;re logged in — after you connect, you can rate this place.
        </p>
        {wa && (
          <div className="max-w-[300px] self-end rounded-[16px_16px_4px_16px] bg-chat-bubble px-3.5 py-3 text-sm leading-normal whitespace-pre-line text-chat-ink">
            {info.message}
          </div>
        )}
        {wa ? (
          <a href={info.whatsappUrl} target="_blank" rel="noopener noreferrer" className={buttonClass("whatsapp", "lg", "w-full")}>
            <MessageCircle aria-hidden className="size-5" />
            Open WhatsApp
          </a>
        ) : (
          <a href={info.telUrl} className={buttonClass("primary", "lg", "w-full")}>
            <Phone aria-hidden className="size-5" />
            Call {formatPhone(info.phone)}
          </a>
        )}
        {wa && canCall && (
          <Button variant="outline" block onClick={() => onSwitch("call")}>
            <Phone aria-hidden className="size-[18px]" />
            Call owner instead
          </Button>
        )}
        {!wa && canWhatsapp && (
          <Button variant="outline" block onClick={() => onSwitch("whatsapp")} className="border-chat text-chat hover:bg-ok-bg hover:text-chat">
            <MessageCircle aria-hidden className="size-[18px]" />
            WhatsApp instead
          </Button>
        )}
        <button type="button" onClick={onClose} className="text-center text-[13px] font-bold text-muted-2 hover:text-ink">
          Back to property
        </button>
      </div>
    </AppDialog>
  );
}
