// C:\Users\user\OneDrive\Desktop\trustlink-group\components\motion-primitives\animated-group.tsx
"use client"

import type { JSX, ReactNode } from "react"
import React from "react"
import { motion, type Variants } from "framer-motion"

export type PresetType =
  | "fade"
  | "slide"
  | "scale"
  | "blur"
  | "blur-slide"
  | "zoom"
  | "flip"
  | "bounce"
  | "rotate"
  | "swing"
  | "fadeUp"
  | "fadeInUp"
  | "fadeDown"
  | "slideUp"
  | "slideDown"

export type AnimatedGroupProps = {
  children: ReactNode
  className?: string
  variants?: {
    container?: Variants
    item?: Variants
  }
  preset?: PresetType
  as?: React.ElementType
  asChild?: boolean
}

const defaultContainerVariants: Variants = {
  visible: {
    transition: {
      staggerChildren: 0.1,
    },
  },
}

const defaultItemVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
}

const presetVariants: Record<PresetType, Variants> = {
  fade: {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  },
  slide: {
    hidden: { y: 20 },
    visible: { y: 0 },
  },
  scale: {
    hidden: { scale: 0.8 },
    visible: { scale: 1 },
  },
  blur: {
    hidden: { filter: "blur(4px)" },
    visible: { filter: "blur(0px)" },
  },
  "blur-slide": {
    hidden: { filter: "blur(4px)", y: 20 },
    visible: { filter: "blur(0px)", y: 0 },
  },
  zoom: {
    hidden: { scale: 0.5 },
    visible: {
      scale: 1,
      transition: { type: "spring" as const, stiffness: 300, damping: 20 },
    },
  },
  flip: {
    hidden: { rotateX: -90 },
    visible: {
      rotateX: 0,
      transition: { type: "spring" as const, stiffness: 300, damping: 20 },
    },
  },
  bounce: {
    hidden: { y: -50 },
    visible: {
      y: 0,
      transition: { type: "spring" as const, stiffness: 400, damping: 10 },
    },
  },
  rotate: {
    hidden: { rotate: -180 },
    visible: {
      rotate: 0,
      transition: { type: "spring" as const, stiffness: 200, damping: 15 },
    },
  },
  swing: {
    hidden: { rotate: -10 },
    visible: {
      rotate: 0,
      transition: { type: "spring" as const, stiffness: 300, damping: 8 },
    },
  },
  fadeUp: {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: "spring" as const, stiffness: 300, damping: 20 },
    },
  },
  fadeInUp: {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: "spring" as const, stiffness: 300, damping: 20 },
    },
  },
  fadeDown: {
    hidden: { opacity: 0, y: -20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: "spring" as const, stiffness: 300, damping: 20 },
    },
  },

  slideUp: {
    hidden: { y: 30 },
    visible: {
      y: 0,
      transition: { type: "spring" as const, stiffness: 300, damping: 20 },
    },
  },
  slideDown: {
    hidden: { y: -30 },
    visible: {
      y: 0,
      transition: { type: "spring" as const, stiffness: 300, damping: 20 },
    },
  },
}

const addDefaultVariants = (variants: Variants) => ({
  hidden: { ...defaultItemVariants.hidden, ...variants.hidden },
  visible: { ...defaultItemVariants.visible, ...variants.visible },
})

function AnimatedGroup({
  children,
  className,
  variants,
  preset,
  as = "div",
}: AnimatedGroupProps) {
  const selectedVariants = {
    item: addDefaultVariants(preset ? presetVariants[preset] : {}),
    container: addDefaultVariants(defaultContainerVariants),
  }
  const containerVariants = variants?.container || selectedVariants.container
  const itemVariants = variants?.item || selectedVariants.item

  const Component = as as keyof JSX.IntrinsicElements
  const MotionComponent = motion(Component)

  return (
    <MotionComponent
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className={className}>
      {React.Children.map(children, (child, index) => (
        <motion.div key={index} variants={itemVariants}>
          {child}
        </motion.div>
      ))}
    </MotionComponent>
  )
}

export { AnimatedGroup }
