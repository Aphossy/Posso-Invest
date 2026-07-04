import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const alertVariants = cva(
  "relative w-full border px-4 py-3 text-sm flex flex-grow flex-row items-center gap-3 [&>svg]:shrink-0 [&>svg]:size-5 [&>svg]:mt-0.5",
  {
    variants: {
      variant: {
        default: "bg-card text-card-foreground border-border",
        destructive:
          "border-destructive/10 bg-[color:color-mix(in_oklab,white_100%,var(--destructive)_50%)] dark:bg-[color:color-mix(in_oklab,black_100%,var(--destructive)_40%)] text-[color:color-mix(in_oklab,black_50%,var(--destructive)_50%)] dark:text-[color:color-mix(in_oklab,white_50%,var(--destructive)_50%)] [&>svg]:text-destructive",
        secondary:
          "border-border bg-secondary text-secondary-foreground [&>svg]:text-secondary-foreground",
        success:
          "border-green-600/10 bg-green-600/20 text-foreground [&>svg]:text-green-600",
        warning:
          "border-yellow-600/10 bg-yellow-600/20 text-secondary-foreground [&>svg]:text-yellow-600",
        info: "border-blue-600/10 bg-blue-600/20 text-blue-600 [&>svg]:text-blue-600",
      },
      radius: {
        none: "rounded-none",
        sm: "rounded-sm",
        md: "rounded-md",
        lg: "rounded-lg",
        full: "rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      radius: "lg",
    },
  }
)

function Alert({
  className,
  variant,
  radius,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) {
  return (
    <div
      data-slot="alert"
      role="alert"
      data-variant={variant}
      data-radius={radius}
      className={cn(alertVariants({ variant, radius }), className)}
      {...props}
    />
  )
}

function AlertIcon({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-icon"
      className={cn(
        "flex-none relative w-9 h-9 rounded-full grid place-items-center",
        className
      )}
      {...props}
    />
  )
}

function AlertContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-content"
      className={cn("flex flex-col gap-0.5 min-w-0 flex-1", className)}
      {...props}
    />
  )
}

function AlertTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-title"
      className={cn(
        "font-medium leading-tight tracking-normal text-base",
        className
      )}
      {...props}
    />
  )
}

function AlertDescription({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      className={cn(
        "text-sm text-muted-foreground [&_p]:leading-relaxed tracking-normal [&_ul]:mt-2 [&_ul]:ml-2 [&_ul]:list-disc [&_ul]:list-inside [&_li]:text-sm",
        "in-data-[variant=destructive]:text-[color:color-mix(in_oklab,black_50%,var(--destructive)_50%)] in-data-[variant=destructive]:dark:text-[color:color-mix(in_oklab,white_50%,var(--destructive)_50%)]",
        "in-data-[variant=success]:text-foreground",
        "in-data-[variant=warning]:text-secondary-foreground",
        "in-data-[variant=info]:text-foreground",
        className
      )}
      {...props}
    />
  )
}

export { Alert, AlertContent, AlertTitle, AlertDescription, AlertIcon }
