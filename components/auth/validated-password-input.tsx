"use client"

import { useEffect, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Eye, EyeOff } from "lucide-react"

import { cn } from "@/lib/utils"
import { usePasswordValidation } from "@/hooks/use-password-validation"
import { Input } from "@/components/ui/input"

import { Label } from "../ui/label"
import { PasswordStrengthIndicator } from "./password-strength-indicator"

interface ValidatedPasswordInputProps {
  id?: string
  label?: string
  value: string
  onChange: (value: string) => void
  onValidationChange?: (isValid: boolean) => void
  error?: string
  placeholder?: string
  required?: boolean
  showStrengthIndicator?: boolean
  showRequirements?: boolean
  minStrengthScore?: number // Minimum score required (1-5)
  className?: string
  disabled?: boolean
}

export function ValidatedPasswordInput({
  id = "password",
  label = "Password",
  value,
  onChange,
  onValidationChange,
  error,
  placeholder = "Enter your password",
  required = false,
  showStrengthIndicator = true,
  showRequirements = true,
  minStrengthScore = 5, // Default: require "Good" strength
  className,
  disabled = false,
}: ValidatedPasswordInputProps) {
  const [showPassword, setShowPassword] = useState(false)
  const { passwordStrength, validatePassword } = usePasswordValidation()

  useEffect(() => {
    if (value) {
      const strength = validatePassword(value)
      // Password is valid if it meets minimum strength score
      const isValid = strength.score >= minStrengthScore
      onValidationChange?.(isValid)
    } else {
      onValidationChange?.(false)
    }
  }, [value, validatePassword, onValidationChange, minStrengthScore])

  const handlePasswordChange = (newValue: string) => {
    onChange(newValue)
    if (newValue) {
      validatePassword(newValue)
    }
  }

  const isPasswordWeak = value && passwordStrength.score < minStrengthScore

  return (
    <div className={cn("space-y-2", className)}>
      <Label
        htmlFor={id}
        className="text-sm font-medium"
        style={{ color: "#605D5E" }}>
        {label}
        {required && "*"}
      </Label>

      <div className="relative">
        <Input
          id={id}
          type={showPassword ? "text" : "password"}
          value={value}
          onChange={(e) => handlePasswordChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          className={cn(
            "pr-10 text-sm placeholder:text-sm",
            error && "border-red-500   focus:border-red-500 focus:ring-red-500",
            isPasswordWeak &&
              "border-amber-500 focus:border-amber-500  focus:ring-amber-500"
          )}
          style={{ backgroundColor: "#F0F0F0", color: "#605D5E" }}
        />

        <motion.button
          type="button"
          className="absolute inset-y-0 right-0 flex items-center pr-3"
          onClick={() => setShowPassword(!showPassword)}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          transition={{ duration: 0.1 }}>
          <motion.div
            initial={false}
            animate={{ rotate: showPassword ? 180 : 0 }}
            transition={{ duration: 0.2 }}>
            {showPassword ? (
              <EyeOff className="h-4 w-4 text-gray-400" />
            ) : (
              <Eye className="h-4 w-4 text-gray-400" />
            )}
          </motion.div>
        </motion.button>
      </div>

      <AnimatePresence>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="text-sm text-red-600">
            {error}
          </motion.p>
        )}
      </AnimatePresence>

      {showStrengthIndicator && (
        <PasswordStrengthIndicator
          password={value}
          strength={passwordStrength}
          showRequirements={showRequirements}
        />
      )}
    </div>
  )
}
