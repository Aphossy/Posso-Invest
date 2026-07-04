"use client"

import type React from "react"
import { motion } from "framer-motion"

import { cardVariants } from "@/lib/animations"

interface AnimatedAuthCardProps {
  children: React.ReactNode
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl"
  minHeight?: string
  className?: string
}

export function AnimatedAuthCard({
  children,
  maxWidth = "xl",
  minHeight = "400px",
  className = "",
}: AnimatedAuthCardProps) {
  const maxWidthClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-4xl",
    "2xl": "max-w-6xl",
  }

  return (
    <motion.div
      className={`w-full ${maxWidthClasses[maxWidth]} overflow-hidden rounded-lg bg-white shadow-md border ${className}`}
      variants={cardVariants}
      initial="initial"
      animate="animate">
      <motion.div
        className="flex flex-col justify-center"
        style={{ minHeight }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}>
        {children}
      </motion.div>
    </motion.div>
  )
}
