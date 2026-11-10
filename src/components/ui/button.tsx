import * as React from "react"
import Link from "next/link"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import { Slot } from "radix-ui"
import { Spinner } from "@/components/ui/spinner"

/**
 * shadcn/ui Button extended with the EasyStay variants from the UI kit:
 * Coral Deep primary, outline, WhatsApp green, blush "soft", ink "dark",
 * coral CTA and plain text links. Sizes follow the design's 40/50/54px.
 */
const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center whitespace-nowrap no-underline transition-colors outline-none select-none focus-visible:ring-3 focus-visible:ring-ring/30 disabled:pointer-events-none disabled:opacity-55 aria-invalid:border-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-[18px]",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-brand-dark hover:text-primary-foreground",
        primary: "bg-primary text-primary-foreground hover:bg-brand-dark hover:text-primary-foreground",
        outline: "border-[1.5px] border-primary bg-white text-primary hover:bg-blush hover:text-brand-dark",
        whatsapp: "bg-chat text-white hover:bg-ok hover:text-white",
        neutral: "border-[1.5px] border-border bg-white text-foreground hover:border-input hover:text-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-blush-2 hover:text-secondary-foreground",
        soft: "bg-secondary text-secondary-foreground hover:bg-blush-2 hover:text-secondary-foreground",
        dark: "bg-ink text-white hover:bg-black hover:text-white",
        coral: "bg-coral text-ink hover:bg-[#ff6a7d] hover:text-ink",
        ghost: "text-foreground hover:bg-muted hover:text-foreground",
        destructive: "bg-destructive/10 text-destructive hover:bg-destructive/20",
        text: "bg-transparent px-0! text-brand-dark hover:text-primary",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-[50px] gap-2 rounded-[14px] px-5 text-[15px] font-bold",
        md: "h-[50px] gap-2 rounded-[14px] px-5 text-[15px] font-bold",
        lg: "h-[54px] gap-2 rounded-[14px] px-6 text-[15px] font-extrabold",
        sm: "h-10 gap-1.5 rounded-[10px] px-3.5 text-[13px] font-bold",
        xs: "h-7 gap-1 rounded-lg px-2 text-xs font-semibold",
        icon: "size-11 rounded-[14px]",
        "icon-xs": "size-6 rounded-md [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8 rounded-lg",
        "icon-lg": "size-12 rounded-[14px]",
      },
      block: { true: "w-full", false: "" },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
      block: false,
    },
  }
)

type ButtonVariantProps = VariantProps<typeof buttonVariants>
export type ButtonVariant = NonNullable<ButtonVariantProps["variant"]>
export type ButtonSize = NonNullable<ButtonVariantProps["size"]>

function Button({
  className,
  variant,
  size,
  block,
  asChild = false,
  loading = false,
  disabled,
  children,
  type,
  ...props
}: React.ComponentProps<"button"> &
  ButtonVariantProps & {
    asChild?: boolean
    loading?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      type={asChild ? undefined : (type ?? "button")}
      disabled={asChild ? undefined : disabled || loading}
      aria-busy={loading || undefined}
      className={cn(buttonVariants({ variant, size, block, className }))}
      {...props}
    >
      {asChild ? (
        children
      ) : (
        <>
          {loading && <Spinner className="size-[18px]" aria-hidden />}
          {children}
        </>
      )}
    </Comp>
  )
}

/** A Next.js link styled as a button. */
function ButtonLink({
  className,
  variant,
  size,
  block,
  ...props
}: React.ComponentProps<typeof Link> & ButtonVariantProps) {
  return <Link data-slot="button" className={cn(buttonVariants({ variant, size, block, className }))} {...props} />
}

/** Class string for elements that can't use <Button> (e.g. external <a>). */
function buttonClass(variant?: ButtonVariant, size?: ButtonSize, extra?: string) {
  return cn(buttonVariants({ variant, size }), extra)
}

export { Button, ButtonLink, buttonClass, buttonVariants }
