"use client"

import * as React from "react"
import * as CheckboxPrimitive from "@radix-ui/react-checkbox"
import { cva, type VariantProps } from "class-variance-authority"
import { motion } from "motion/react"

import { cn } from "@/lib/utils"

const checkboxVariants = cva(
  "group flex relative justify-center items-center outline-hidden focus:outline-hidden focus-visible:outline-hidden ease-ease disabled:cursor-not-allowed disabled:grayscale border cursor-pointer border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary data-[state=checked]:focus-visible:ring-1 data-[state=checked]:focus-visible:ring-ring data-[state=checked]:focus-visible:ring-offset-2 data-[state=checked]:focus-visible:ring-offset-background transition-all motion-reduce:transition-none",
  {
    variants: {
      size: {
        default: "size-4 p-[1.5px]",
        sm: "size-5 p-[2px]",
        lg: "size-6 p-[3px]",
        xl: "size-7 p-[4px]",
      },
      radius: {
        none: "rounded-none",
        default: "rounded",
        sm: "rounded-sm",
        lg: "rounded-md",
        xl: "rounded-lg",
        full: "rounded-full",
      },
      reduceMotion: {
        true: "transition-none",
        false: "",
      },
    },
    defaultVariants: {
      size: "default",
      radius: "default",
      reduceMotion: false,
    },
  }
)

interface CheckboxRootProps
  extends
    React.ComponentPropsWithRef<typeof CheckboxPrimitive.Root>,
    VariantProps<typeof checkboxVariants> {
  reduceMotion?: boolean | null
}

interface CheckboxRootContextType {
  checked: boolean | "indeterminate"
  setChecked: (checked: boolean | "indeterminate") => void
  reduceMotion?: boolean | null
}

const CheckboxRootContext = React.createContext<
  CheckboxRootContextType | undefined
>(undefined)

const useCheckboxRoot = (): CheckboxRootContextType => {
  const context = React.useContext(CheckboxRootContext)
  if (!context) {
    throw new Error("useCheckboxRoot must be used within a CheckboxRoot")
  }
  return context
}

function CheckboxRoot({
  className,
  size,
  radius,
  reduceMotion,
  ref,
  onCheckedChange,
  ...props
}: CheckboxRootProps) {
  const [isChecked, setIsChecked] = React.useState<boolean | "indeterminate">(
    props?.checked ?? props?.defaultChecked ?? true
  )

  React.useEffect(() => {
    if (props?.checked !== undefined) setIsChecked(props.checked)
  }, [props?.checked])

  const handleCheckedChange = React.useCallback(
    (checked: boolean | "indeterminate") => {
      setIsChecked(checked)
      onCheckedChange?.(checked)
    },
    [onCheckedChange]
  )

  return (
    <CheckboxRootContext.Provider
      value={{
        checked: isChecked,
        setChecked: handleCheckedChange,
        reduceMotion: reduceMotion ?? undefined,
      }}>
      <CheckboxPrimitive.Root
        data-size={size}
        data-radius={radius}
        data-checked={isChecked}
        ref={ref}
        className={cn(
          checkboxVariants({
            size,
            radius,
            reduceMotion: reduceMotion ?? undefined,
            className,
          })
        )}
        checked={isChecked}
        onCheckedChange={handleCheckedChange}
        {...props}
      />
    </CheckboxRootContext.Provider>
  )
}
CheckboxRoot.displayName = CheckboxPrimitive.Root.displayName

export type CheckboxIndicatorProps = React.ComponentPropsWithRef<
  typeof CheckboxPrimitive.Indicator
>

function CheckboxIndicator({
  className,
  children,
  ref,
  ...props
}: CheckboxIndicatorProps) {
  const { checked, reduceMotion } = useCheckboxRoot()

  return (
    <CheckboxPrimitive.Indicator
      ref={ref}
      className={cn(
        "relative flex items-center justify-center w-full h-full data-[state=indeterminate]:text-secondary-foreground text-primary-foreground",
        className
      )}
      {...props}
      asChild
      forceMount>
      {children ? (
        <motion.div
          className="flex items-center justify-center"
          initial={{
            opacity: 0,
            scale: 0.5,
          }}
          animate={{
            opacity: checked ? 1 : 0,
            scale: checked ? 1 : 0.5,
          }}
          transition={
            reduceMotion
              ? { duration: 0 }
              : {
                  duration: 0.3,
                  ease: [0.175, 0.885, 0.32, 1.1],
                }
          }>
          {children}
        </motion.div>
      ) : checked === "indeterminate" ? (
        <motion.svg
          data-slot="checkbox-indicator-indeterminate"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="3.5"
          stroke="currentColor"
          className="size-3.5"
          initial="hidden"
          animate="visible"
          transition={reduceMotion ? { duration: 0 } : undefined}>
          <motion.path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M5 12h14"
            variants={{
              visible: {
                pathLength: 1,
                opacity: 1,
              },
              hidden: {
                pathLength: 0,
                opacity: 0,
              },
            }}
            transition={reduceMotion ? { duration: 0 } : undefined}
          />
        </motion.svg>
      ) : (
        <motion.svg
          data-slot="checkbox-indicator"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="3.5"
          stroke="currentColor"
          className="size-3.5"
          initial="unchecked"
          animate={checked ? "checked" : "unchecked"}
          transition={reduceMotion ? { duration: 0 } : undefined}>
          <motion.path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4.5 12.75l6 6 9-13.5"
            variants={{
              checked: {
                pathLength: 1,
                opacity: 1,
              },
              unchecked: {
                pathLength: 0,
                opacity: 0,
              },
            }}
            transition={reduceMotion ? { duration: 0 } : undefined}
          />
        </motion.svg>
      )}
    </CheckboxPrimitive.Indicator>
  )
}
CheckboxIndicator.displayName = CheckboxPrimitive.Indicator.displayName

export interface CheckboxProps
  extends
    React.ComponentPropsWithRef<typeof CheckboxPrimitive.Root>,
    VariantProps<typeof checkboxVariants> {
  reduceMotion?: boolean | null
}

function Checkbox({
  className,
  size,
  radius,
  reduceMotion,
  children,
  ref,
  ...props
}: CheckboxProps) {
  return (
    <CheckboxRoot
      ref={ref}
      className={className}
      size={size}
      radius={radius}
      reduceMotion={reduceMotion}
      {...props}>
      <CheckboxIndicator>{children}</CheckboxIndicator>
    </CheckboxRoot>
  )
}
Checkbox.displayName = "Checkbox"

export { Checkbox, CheckboxRoot, CheckboxIndicator }
