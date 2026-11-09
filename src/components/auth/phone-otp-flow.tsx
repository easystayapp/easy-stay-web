"use client";

import { MessageSquareText } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import type { ConfirmCode } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group";
import { OtpInput } from "@/components/ui/otp-input";
import { ErrorNote } from "@/components/ui/primitives";
import { errorMessage } from "@/lib/client/api";
import { formatPhone, normalizeIndianMobile } from "@/lib/domain/format";

const RESEND_SECONDS = 30;

/**
 * Mobile number → 6-digit SMS code. `signin` signs in with the number;
 * `link` verifies it on the signed-in account (owner tools).
 */
export function PhoneOtpFlow({
  mode,
  initialPhone = "",
  sendLabel = "Send OTP",
  verifyLabel = "Verify & continue",
  onVerified,
  onStepChange,
}: {
  mode: "signin" | "link";
  initialPhone?: string;
  sendLabel?: string;
  verifyLabel?: string;
  onVerified: () => void | Promise<void>;
  onStepChange?: (step: "phone" | "code") => void;
}) {
  const { sendOtp } = useAuth();
  const [phone, setPhone] = useState(initialPhone);
  const [e164, setE164] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(0);
  const confirmRef = useRef<ConfirmCode | null>(null);
  const recaptchaHost = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (seconds <= 0) return;
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds]);

  const send = async (number: string) => {
    setError(null);
    setBusy(true);
    try {
      confirmRef.current = await sendOtp(number, recaptchaHost.current!, mode);
      setE164(number);
      setCode("");
      setSeconds(RESEND_SECONDS);
      onStepChange?.("code");
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const submitPhone = (e: React.FormEvent) => {
    e.preventDefault();
    const n = normalizeIndianMobile(phone);
    if (!n) return setError("Enter a valid 10-digit mobile number.");
    void send(n);
  };

  const verify = async (value = code) => {
    if (value.length !== 6 || !confirmRef.current) return setError("Enter the 6-digit code.");
    setError(null);
    setBusy(true);
    try {
      await confirmRef.current(value);
      await onVerified();
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div ref={recaptchaHost} />
      {!e164 ? (
        <form onSubmit={submitPhone} className="flex flex-col gap-3" noValidate>
          <Field>
            <FieldLabel htmlFor="otp-phone">Mobile number</FieldLabel>
            <InputGroup className="h-[54px]">
              <InputGroupAddon>
                <InputGroupText className="border-r border-input pr-3 text-[15px] font-bold text-foreground">+91</InputGroupText>
              </InputGroupAddon>
              <InputGroupInput
                id="otp-phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel-national"
                placeholder="98765 43210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                aria-invalid={!!error || undefined}
                className="font-bold"
              />
            </InputGroup>
          </Field>
          {error && <ErrorNote>{error}</ErrorNote>}
          <Button type="submit" size="lg" block loading={busy}>
            {sendLabel}
          </Button>
        </form>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void verify();
          }}
          className="flex flex-col gap-4"
          noValidate
        >
          <div className="flex items-start gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-blush text-brand">
              <MessageSquareText aria-hidden className="size-5" />
            </span>
            <div className="flex flex-col gap-1">
              <span className="text-[17px] font-extrabold">Enter the 6-digit code</span>
              <span className="text-[13px] text-muted-foreground">
                Sent by SMS to {formatPhone(e164)}.{" "}
                <button
                  type="button"
                  className="font-bold text-brand hover:text-brand-dark"
                  onClick={() => {
                    setE164(null);
                    setError(null);
                    onStepChange?.("phone");
                  }}
                >
                  Change
                </button>
              </span>
            </div>
          </div>
          <OtpInput value={code} onChange={setCode} onComplete={(v) => void verify(v)} disabled={busy} invalid={!!error} />
          <p className="text-[13px] text-muted-foreground">
            Didn&apos;t get it?{" "}
            {seconds > 0 ? (
              <>
                Resend in <b className="text-ink">0:{String(seconds).padStart(2, "0")}</b>
              </>
            ) : (
              <button type="button" className="font-bold text-brand hover:text-brand-dark" onClick={() => void send(e164)}>
                Resend code
              </button>
            )}
          </p>
          {error && <ErrorNote>{error}</ErrorNote>}
          <Button type="submit" size="lg" block loading={busy} disabled={code.length !== 6}>
            {verifyLabel}
          </Button>
        </form>
      )}
    </div>
  );
}
