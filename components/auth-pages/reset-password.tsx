// components\pages\reset-password.tsx
"use client"

import type React from "react"
import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { AnimatePresence, motion } from "framer-motion"
import { CheckCircle, Lock } from "lucide-react"
import { z } from "zod/v3"

import { authClient } from "@/lib/auth-client"
import { AnimatedAuthCard } from "@/components/auth/animated-auth-card"
import { AnimatedLoadingButton } from "@/components/auth/animated-loading-button"
import { AnimatedPasswordField } from "@/components/auth/animated-password-field"

import { ValidatedPasswordInput } from "../auth/validated-password-input"

const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(1, "Password is required")
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain an uppercase letter")
      .regex(/[a-z]/, "Password must contain a lowercase letter")
      .regex(/\d/, "Password must contain a number")
      .regex(/[^a-zA-Z0-9]/, "Password must contain a special character")
      .max(16, "Password must be at most 16 characters"),
    confirmPassword: z
      .string()
      .min(8, "Password must be at least 8 characters"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  })

export default function ResetPasswordPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get("token")
  const [isPasswordValid, setIsPasswordValid] = useState(false)

  const [formData, setFormData] = useState({
    password: "",
    confirmPassword: "",
  })
  const [errors, setErrors] = useState<{
    password?: string
    confirmPassword?: string
    general?: string
  }>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")
  const [isSubmitted, setIsSubmitted] = useState(false)

  useEffect(() => {
    if (!token) {
      setErrors({
        general: "Invalid reset link. Please request a new password reset.",
      })
    }
  }, [token])

  useEffect(() => {
    if (successMessage) {
      setIsSubmitted(true)
    }
  }, [successMessage])

  const updateField = (
    field: "password" | "confirmPassword",
    value: string
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }))
    }
    // Clear general error when user starts typing
    if (errors.general) {
      setErrors((prev) => ({ ...prev, general: undefined }))
    }
    // Clear success message when user starts typing
    if (successMessage) {
      setSuccessMessage("")
    }
  }

  const validateForm = (): boolean => {
    const result = resetPasswordSchema.safeParse(formData)

    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors
      const newErrors: {
        password?: string
        confirmPassword?: string
        general?: string
      } = {}

      for (const [field, messages] of Object.entries(fieldErrors)) {
        if (Array.isArray(messages)) {
          newErrors[field as keyof typeof newErrors] = messages[0]
        } else {
          newErrors[field as keyof typeof newErrors] = messages
        }
      }

      setErrors(newErrors)
      return false
    }

    setErrors({})
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!token) {
      setErrors({ general: "Invalid reset token" })
      return
    }

    if (!validateForm()) return

    setIsSubmitting(true)

    try {
      const { error } = await authClient.resetPassword({
        newPassword: formData.password,
        token,
      })

      if (error) {
        setErrors({ general: error.message || "Failed to reset password" })
        return
      }

      setSuccessMessage("Password has been successfully reset")
      setIsSubmitted(true)

      // Redirect to login after a delay
      setTimeout(() => {
        router.push("/login")
      }, 2000)
    } catch (error: any) {
      console.error("Reset password error:", error)
      setErrors({ general: "Failed to reset password" })
    } finally {
      setIsSubmitting(false)
    }
  }

  const isFormValid =
    isPasswordValid &&
    formData.password &&
    formData.confirmPassword &&
    formData.password === formData.confirmPassword &&
    token

  return (
    <>
      <AnimatedAuthCard className="w-full max-w-md">
        <div className="md:min-h-md mx-auto w-full  p-6 text-center md:p-8">
          <AnimatePresence mode="wait">
            {!isSubmitted ? (
              <motion.div
                key="form"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.5 }}>
                <motion.div
                  className="mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-full"
                  style={{ backgroundColor: "#165598" }}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 200 }}>
                  <Lock className="h-7 w-7 text-white" />
                </motion.div>

                <motion.h1
                  className="mb-4 text-3xl font-bold"
                  style={{ color: "#165598" }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.5 }}>
                  Reset Password
                </motion.h1>

                <motion.p
                  className="mb-5 text-left text-base text-gray-600"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4, duration: 0.5 }}>
                  Enter your new password below. Make sure it's strong and
                  secure.
                </motion.p>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <AnimatePresence>
                    {errors.general && (
                      <motion.div
                        className="text-center text-sm text-red-600  flex items-center justify-center space-x-2 rounded-lg border border-red-200 bg-red-50 p-2"
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.3 }}>
                        {errors.general}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <ValidatedPasswordInput
                    id="password"
                    required
                    label="New Password"
                    value={formData.password}
                    onChange={(value) => updateField("password", value)}
                    onValidationChange={setIsPasswordValid}
                    minStrengthScore={5} // Require "Strong" strength
                    error={errors.password}
                  />

                  <AnimatedPasswordField
                    id="confirmPassword"
                    label="Confirm New Password"
                    value={formData.confirmPassword ?? ""}
                    onChange={(value) => updateField("confirmPassword", value)}
                    error={errors.confirmPassword}
                    placeholder="Confirm new password"
                    required
                    delay={0.6}
                  />

                  <AnimatePresence>
                    {formData.password &&
                      formData.confirmPassword &&
                      formData.password !== formData.confirmPassword && (
                        <motion.p
                          className="text-left -mt-4 text-xs text-red-500"
                          transition={{ duration: 0.3 }}>
                          Passwords do not match
                        </motion.p>
                      )}
                  </AnimatePresence>

                  <AnimatedLoadingButton
                    type="submit"
                    isLoading={isSubmitting}
                    loadingText="Resetting..."
                    className="w-full"
                    disabled={!isFormValid || isSubmitting}>
                    Reset Password
                  </AnimatedLoadingButton>

                  <div className="mt-4 text-center text-sm text-muted-foreground">
                    Remembered your password?{" "}
                    <Link
                      href="/login"
                      className="font-medium text-primary hover:text-primary/90 hover:underline underline-offset-4">
                      Back to Login
                    </Link>
                  </div>
                </form>
              </motion.div>
            ) : (
              <motion.div
                key="success"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.5 }}>
                <motion.div
                  className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-100"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 200 }}>
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </motion.div>

                <motion.h1
                  className="mb-4 text-3xl font-bold"
                  style={{ color: "#165598" }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.5 }}>
                  Password Reset Successful
                </motion.h1>

                <motion.p
                  className="mb-8 text-gray-600"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4, duration: 0.5 }}>
                  {successMessage ||
                    "Your password has been successfully reset. You can now log in with your new password."}
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5, duration: 0.5 }}>
                  <Link href="/login">
                    <AnimatedLoadingButton className="w-full">
                      Continue to Login
                    </AnimatedLoadingButton>
                  </Link>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </AnimatedAuthCard>
    </>
  )
}
