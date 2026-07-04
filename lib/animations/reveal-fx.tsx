// reveal-fx.tsx
/* eslint-disable react-hooks/exhaustive-deps */
"use client"

import type React from "react"
import { forwardRef, useEffect, useRef, useState } from "react"
import { motion, type HTMLMotionProps } from "framer-motion"

import { cn } from "@/lib/utils"

interface RevealFxProps extends Omit<HTMLMotionProps<"div">, "children"> {
  children: React.ReactNode
  speed?: "slow" | "medium" | "fast" | number
  delay?: number
  revealedByDefault?: boolean
  translateY?: number
  trigger?: boolean
  useMask?: boolean
  className?: string
  as?: keyof React.JSX.IntrinsicElements
}

const RevealFx = forwardRef<HTMLDivElement, RevealFxProps>(
  (
    {
      children,
      speed = "medium",
      delay = 0,
      revealedByDefault = false,
      translateY = 20,
      trigger,
      useMask = true,
      className,
      style,
      as: Component = "div",
      ...rest
    },
    ref
  ) => {
    const [isRevealed, setIsRevealed] = useState(revealedByDefault)
    const [maskRemoved, setMaskRemoved] = useState(false)
    const transitionTimeoutRef = useRef<NodeJS.Timeout | null>(null)

    const getSpeedDurationMs = () => {
      if (typeof speed === "number") {
        return speed
      }

      switch (speed) {
        case "fast":
          return 800
        case "medium":
          return 1200
        case "slow":
          return 1800
        default:
          return 1200
      }
    }

    const getSpeedDuration = () => {
      const ms = getSpeedDurationMs()
      return ms / 1000
    }

    useEffect(() => {
      if (trigger === undefined) {
        const timer = setTimeout(() => {
          setIsRevealed(true)

          if (useMask) {
            transitionTimeoutRef.current = setTimeout(() => {
              setMaskRemoved(true)
            }, getSpeedDurationMs())
          }
        }, delay * 1000)

        return () => {
          clearTimeout(timer)
          if (transitionTimeoutRef.current) {
            clearTimeout(transitionTimeoutRef.current)
          }
        }
      }
    }, [delay, useMask])

    useEffect(() => {
      if (trigger !== undefined) {
        setIsRevealed(trigger)
        setMaskRemoved(false)

        if (trigger && useMask) {
          if (transitionTimeoutRef.current) {
            clearTimeout(transitionTimeoutRef.current)
          }

          transitionTimeoutRef.current = setTimeout(() => {
            setMaskRemoved(true)
          }, getSpeedDurationMs())
        }
      }
    }, [trigger, useMask])

    // Mask styles for CSS mask-based animation
    const maskStyles =
      useMask && !maskRemoved
        ? {
            maskImage:
              "linear-gradient(to right, black 0%, black 25%, transparent 50%)",
            maskSize: "400% 100%",
            maskPosition: isRevealed ? "0 0" : "100% 0",
            WebkitMaskImage:
              "linear-gradient(to right, black 0%, black 25%, transparent 50%)",
            WebkitMaskSize: "400% 100%",
            WebkitMaskPosition: isRevealed ? "0 0" : "100% 0",
          }
        : {}

    // Animation variants for Framer Motion
    const variants = {
      hidden: {
        y: translateY,
        filter: useMask ? "blur(16px)" : "blur(8px)",
        opacity: useMask ? 1 : 0,
      },
      visible: {
        y: 0,
        filter: "blur(0px)",
        opacity: 1,
      },
    }

    const MotionComponent = motion[Component as keyof typeof motion] as any

    return (
      <MotionComponent
        ref={ref}
        initial="hidden"
        animate={isRevealed ? "visible" : "hidden"}
        variants={variants}
        transition={{
          duration: getSpeedDuration(),
          ease: [0.25, 0.1, 0.25, 1],
        }}
        style={{
          ...maskStyles,
          ...style,
        }}
        className={cn("w-full", className)}
        {...rest}>
        {children}
      </MotionComponent>
    )
  }
)

RevealFx.displayName = "RevealFx"

export { RevealFx }
