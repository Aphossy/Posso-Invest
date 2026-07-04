"use client"

import { motion } from "framer-motion"
import { Check, X } from "lucide-react"

import type { PasswordStrength } from "@/hooks/use-password-validation"

interface PasswordStrengthIndicatorProps {
  password: string
  strength: PasswordStrength
  showRequirements?: boolean
}

export function PasswordStrengthIndicator({
  password,
  strength,
  showRequirements = true,
}: PasswordStrengthIndicatorProps) {
  const getStrengthBarColor = () => {
    switch (strength.color) {
      case "red":
        return "bg-red-500"
      case "orange":
        return "bg-orange-500"
      case "yellow":
        return "bg-yellow-500"
      case "blue":
        return "bg-blue-500"
      case "green":
        return "bg-green-500"
      default:
        return "bg-gray-300"
    }
  }

  const getStrengthTextColor = () => {
    switch (strength.color) {
      case "red":
        return "text-red-600"
      case "orange":
        return "text-orange-600"
      case "yellow":
        return "text-yellow-600"
      case "blue":
        return "text-blue-600"
      case "green":
        return "text-green-600"
      default:
        return "text-gray-500"
    }
  }

  if (!password) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-3">
      {/* Strength Bar */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <div className="h-2 flex-1 rounded-full bg-gray-200">
            <motion.div
              className={`h-2 rounded-full transition-all duration-300 ${getStrengthBarColor()}`}
              initial={{ width: 0 }}
              animate={{ width: `${(strength.score / 5) * 100}%` }}
            />
          </div>
          <span className={`text-sm font-medium ${getStrengthTextColor()}`}>
            {strength.feedback}
          </span>
        </div>
      </div>

      {/* Requirements List */}
      {showRequirements && (
        <div className="space-y-1">
          <p className="text-left text-xs font-medium text-gray-600">
            Password requirements:
          </p>
          <div className="grid grid-cols-2 md:grid-cols-2 gap-1 text-xs">
            <RequirementItem
              met={strength.requirements.length}
              text="At least 8 characters"
            />
            <RequirementItem
              met={strength.requirements.uppercase}
              text="One uppercase letter "
            />
            <RequirementItem
              met={strength.requirements.lowercase}
              text="One lowercase letter"
            />
            <RequirementItem
              met={strength.requirements.number}
              text="One number"
            />
            <RequirementItem
              met={strength.requirements.special}
              text="One special character"
            />
          </div>
        </div>
      )}

      {/* Strength Warning */}
      {/* {password && !strength.isStrong && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 p-2">
          <X className="h-4 w-4 text-amber-600" />
          <p className="text-xs text-amber-700">
            Password is too weak. Please meet at least 4 requirements for a
            strong password.
          </p>
        </motion.div>
      )} */}
    </motion.div>
  )
}

interface RequirementItemProps {
  met: boolean
  text: string
}

function RequirementItem({ met, text }: RequirementItemProps) {
  return (
    <motion.div
      className="flex items-center gap-2"
      initial={{ opacity: 0.5 }}
      animate={{ opacity: 1 }}>
      {met ? (
        <Check className="h-3 w-3 text-green-500" />
      ) : (
        <X className="h-3 w-3 text-gray-400" />
      )}
      <span className={met ? "text-green-600" : "text-gray-500"}>{text}</span>
    </motion.div>
  )
}
