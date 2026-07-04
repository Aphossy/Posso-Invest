"use client"

import type React from "react"
import { useEffect, useRef } from "react"
import { AnimatePresence, motion } from "framer-motion"

import {
  messageVariants,
  otpVariants,
  staggerContainer,
} from "@/lib/animations"
import { Input } from "@/components/ui/input"

interface AnimatedOTPInputProps {
  value: string[]
  onChange: (otp: string[]) => void
  length?: number
  error?: string
  isSuccess?: boolean
}

export function AnimatedOTPInput({
  value,
  onChange,
  length = 6,
  error,
  isSuccess = false,
}: AnimatedOTPInputProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus()
    }
  }, [])

  const handleChange = (index: number, inputValue: string) => {
    if (inputValue.length > 1) return

    const newOtp = [...value]
    newOtp[index] = inputValue
    onChange(newOtp)

    if (inputValue && index < length - 1) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !value[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData("text/plain").slice(0, length)
    const newOtp = pastedData
      .split("")
      .concat(Array(length - pastedData.length).fill(""))
    onChange(newOtp)
  }

  return (
    <div>
      <motion.div
        className="flex justify-center space-x-3"
        variants={staggerContainer}
        initial="initial"
        animate="animate">
        {Array.from({ length }, (_, index) => (
          <motion.div
            key={index}
            variants={otpVariants}
            animate={
              isSuccess && value[index]
                ? "success"
                : error && value[index]
                  ? "error"
                  : "animate"
            }
            whileFocus="focus"
            transition={{ delay: index * 0.1 }}>
            <Input
              ref={(el) => {
                inputRefs.current[index] = el
              }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={value[index] || ""}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onPaste={handlePaste}
              className="h-12 w-12 border-gray-300 text-center text-lg font-semibold transition-all duration-200 focus:border-primary focus:ring-primary"
              style={{ backgroundColor: "#F0F0F0", color: "#605D5E" }}
            />
          </motion.div>
        ))}
      </motion.div>

      <AnimatePresence mode="wait">
        {error && (
          <motion.p
            className="my-4 rounded-lg border border-red-200 bg-red-50 p-3 text-center"
            variants={messageVariants}
            initial="initial"
            animate="animate"
            exit="exit">
            <span className="text-sm text-red-700">{error}</span>
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  )
}
