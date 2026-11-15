"use client";

import { CalendarCheck, Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { VisitPicker } from "@/components/enquiry/visit-picker";
import { AppDialog } from "@/components/ui/app-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ErrorNote, Segmented } from "@/components/ui/primitives";
import { Textarea } from "@/components/ui/textarea";
import { api, errorMessage } from "@/lib/client/api";
import { formatVisit } from "@/lib/domain/format";
import { MAX_MESSAGE_LENGTH } from "@/lib/domain/ops";

type Mode = "visit" | "message";

/** Enquiry with an optional visit slot. Opens the chat thread once sent. */
export function EnquiryDialog({
  propertyId,
  propertyTitle,
  initialMode = "visit",
  onClose,
}: {
  propertyId: string;
  propertyTitle: string;
  initialMode?: Mode;
  onClose: () => void;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [visitAt, setVisitAt] = useState<number | null>(null);
  const [message, setMessage] = useState("Hi, is this still available? I'd like to see the place.");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = async () => {
    if (mode === "visit" && !visitAt) return setError("Pick a day and time for the visit.");
    setBusy(true);
    setError(null);
    try {
      const { id } = await api.sendEnquiry({ propertyId, message: message.trim(), visitAt: mode === "visit" ? visitAt : null });
      router.push(`/inbox/${encodeURIComponent(id)}`);
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  };

  return (
    <AppDialog open onClose={onClose} title={mode === "visit" ? "Book a visit" : "Message the owner"} description={propertyTitle} wide>
      <div className="mt-4 flex flex-col gap-5">
        <Segmented<Mode>
          label="What would you like to do?"
          value={mode}
          onChange={(m) => {
            setMode(m);
            setError(null);
          }}
          options={[
            { value: "visit", label: "Book a visit" },
            { value: "message", label: "Just message" },
          ]}
        />

        {mode === "visit" && (
          <div className="flex flex-col gap-2">
            <span className="text-sm font-extrabold">When can you come?</span>
            <VisitPicker value={visitAt} onChange={setVisitAt} />
            {visitAt && (
              <span className="flex items-center gap-1.5 text-[13px] font-bold text-ok">
                <CalendarCheck aria-hidden className="size-4" />
                {formatVisit(visitAt)} · the owner will confirm or suggest another time
              </span>
            )}
          </div>
        )}

        <div className="flex flex-col gap-2">
          <Label htmlFor="enquiry-message" className="text-sm font-extrabold">Message</Label>
          <Textarea
            id="enquiry-message"
            value={message}
            maxLength={MAX_MESSAGE_LENGTH}
            onChange={(e) => setMessage(e.target.value)}
            className="min-h-20"
          />
        </div>

        <p className="flex items-start gap-2 text-xs text-muted-foreground">
          <Lock aria-hidden className="mt-px size-3.5 shrink-0" />
          Phone numbers stay hidden in chat until the owner accepts your enquiry. Never pay a token amount before visiting.
        </p>

        {error && <ErrorNote>{error}</ErrorNote>}
        <Button size="lg" block loading={busy} onClick={send}>
          {mode === "visit" ? "Request visit" : "Send message"}
        </Button>
      </div>
    </AppDialog>
  );
}
