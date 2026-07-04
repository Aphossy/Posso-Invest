"use client"

import type React from "react"
import { motion } from "framer-motion"

import { buttonVariants } from "@/lib/animations"
import { Button } from "@/components/ui/button"

import { Loader } from "../common/loader"

interface AnimatedLoadingButtonProps {
  children: React.ReactNode
  isLoading?: boolean
  disabled?: boolean
  onClick?: () => void
  type?: "button" | "submit" | "reset"
  variant?: "default" | "outline"
  loadingText?: string
  className?: string
}

export function AnimatedLoadingButton({
  children,
  isLoading = false,
  disabled = false,
  onClick,
  type = "button",
  variant = "default",
  loadingText = "Loading...",
  className = "",
}: AnimatedLoadingButtonProps) {
  const baseClasses =
    "w-full py-3 font-medium rounded-full transition-all duration-200"

  const variantClasses = {
    default: "text-white",
    outline: "border-2 bg-transparent",
  }

  const variantStyles = {
    default: { backgroundColor: "#007952" },
    outline: { borderColor: "#007952", color: "#007952" },
  }

  return (
    <motion.div
      variants={buttonVariants}
      initial="initial"
      whileHover={!disabled && !isLoading ? "hover" : "initial"}
      whileTap={!disabled && !isLoading ? "tap" : "initial"}
      animate={isLoading ? "loading" : "initial"}>
      <Button
        type={type}
        onClick={onClick}
        disabled={disabled || isLoading}
        className={`${baseClasses} ${variantClasses[variant]} ${className}`}
        style={variantStyles[variant]}>
        {isLoading && (
          <motion.div className="mr-2 inline-block">
            <Loader className="h-4 w-4" />
          </motion.div>
        )}
        {isLoading ? loadingText : children}
      </Button>
    </motion.div>
  )
}
