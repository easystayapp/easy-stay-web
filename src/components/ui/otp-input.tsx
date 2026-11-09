"use client";

import { REGEXP_ONLY_DIGITS } from "input-otp";
import { cn } from "@/lib/utils";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "./input-otp";

/** 6-digit SMS code using shadcn InputOTP (autofill, paste, backspace built in). */
export function OtpInput({
  value,
  onChange,
  onComplete,
  disabled,
  invalid,
}: {
  value: string;
  onChange: (v: string) => void;
  onComplete?: (v: string) => void;
  disabled?: boolean;
  invalid?: boolean;
}) {
  return (
    <InputOTP
      maxLength={6}
      pattern={REGEXP_ONLY_DIGITS}
      value={value}
      onChange={onChange}
      onComplete={onComplete}
      disabled={disabled}
      autoFocus
      aria-label="One-time code"
      containerClassName="w-full"
    >
      <InputOTPGroup className="grid w-full grid-cols-6 gap-2">
        {Array.from({ length: 6 }, (_, i) => (
          <InputOTPSlot
            key={i}
            index={i}
            aria-invalid={invalid || undefined}
            className={cn(
              "h-14 w-full rounded-[14px]! border-[1.5px]! border-input bg-white text-[22px] font-extrabold first:rounded-[14px] last:rounded-[14px]",
              "data-[active=true]:border-ring data-[active=true]:ring-3 data-[active=true]:ring-ring/15",
            )}
          />
        ))}
      </InputOTPGroup>
    </InputOTP>
  );
}
