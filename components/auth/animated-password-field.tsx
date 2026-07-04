// components\auth\animated-password-field.tsx
"use client"

import { useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Eye, EyeOff } from "lucide-react"

import { fieldVariants, messageVariants } from "@/lib/animations"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface AnimatedPasswordFieldProps {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  error?: string
  placeholder?: string
  required?: boolean
  className?: string
  onValidationChange?: (isValid: boolean) => void
  showStrengthIndicator?: boolean
  showRequirements?: boolean
  minStrengthScore?: number
  delay?: number
}

export function AnimatedPasswordField({
  id,
  label,
  value,
  onChange,
  error,
  placeholder,
  required = false,
  className = "",
  delay = 0,
}: AnimatedPasswordFieldProps) {
  const [showPassword, setShowPassword] = useState(false)

  return (
    <motion.div
      className={className}
      variants={fieldVariants}
      initial="initial"
      animate="animate"
      transition={{ delay }}>
      <motion.div whileHover={{ x: 2 }} transition={{ duration: 0.2 }}>
        <Label
          htmlFor={id}
          className="text-sm font-medium"
          style={{ color: "#605D5E" }}>
          {label}
          {required && "*"}
        </Label>
      </motion.div>

      <motion.div
        className="relative mt-1"
        animate={error ? "error" : "animate"}
        variants={fieldVariants}>
        <Input
          id={id}
          type={showPassword ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="border-gray-300 text-sm placeholder:text-sm pr-10 transition-all duration-200 focus:border-primary focus:ring-primary"
          style={{ backgroundColor: "#F0F0F0", color: "#605D5E" }}
          placeholder={placeholder}
          required={required}
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
      </motion.div>

      <AnimatePresence mode="wait">
        {error && (
          <motion.p
            className="mt-1 text-xs text-red-500"
            variants={messageVariants}
            initial="initial"
            animate="animate"
            exit="exit">
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
