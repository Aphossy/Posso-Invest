// components\pages\forgot-password.tsx
"use client"

import type React from "react"
import { useEffect, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { AnimatePresence, motion } from "framer-motion"
import { CheckCircle, Mail } from "lucide-react"
import { z } from "zod"

import { authClient } from "@/lib/auth-client"
import { AnimatedAuthCard } from "@/components/auth/animated-auth-card"
import { AnimatedFormField } from "@/components/auth/animated-form-field"
import { AnimatedLoadingButton } from "@/components/auth/animated-loading-button"

const emailSchema = z.object({
  email: z.email("Email is invalid"),
})

export default function ForgotPasswordPage() {
  const searchParams = useSearchParams()
  const emailParam = searchParams.get("email")

  const [formData, setFormData] = useState({ email: emailParam || "" })
  const [errors, setErrors] = useState<{ email?: string; general?: string }>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")
  const [isSubmitted, setIsSubmitted] = useState(false)

  useEffect(() => {
    if (successMessage) {
      setIsSubmitted(true)
    }
  }, [successMessage])

  const updateField = (field: "email", value: string) => {
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
    const result = emailSchema.safeParse(formData)

    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors
      const newErrors: { email?: string; general?: string } = {}

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
    if (!validateForm()) return

    setIsSubmitting(true)

    try {
      const { data, error } = await authClient.requestPasswordReset({
        email: formData.email,
        redirectTo: "/reset-password",
      })

      if (error) {
        setErrors({ general: error.message || "Failed to send reset email" })
        return
      }

      setSuccessMessage("Password reset link sent to your email")
      setIsSubmitted(true)
    } catch (error: any) {
      console.error("Forgot password error:", error)
      setErrors({ general: "Failed to send reset email" })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleTryAgain = () => {
    setIsSubmitted(false)
    setSuccessMessage("")
    setErrors({})
  }

  return (
    <AnimatedAuthCard className="w-full max-w-md">
      <div className="mx-auto w-full max-w-md p-6 text-center md:min-w-md md:p-8">
        <AnimatePresence mode="wait">
          {!isSubmitted ? (
            <motion.div
              key="form"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.5 }}>
              <motion.div
                className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full"
                style={{ backgroundColor: "#165598" }}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}>
                <Mail className="h-8 w-8 text-white" />
              </motion.div>

              <motion.h1
                className="mb-4 text-3xl font-bold"
                style={{ color: "#165598" }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }}>
                Forgot Password?
              </motion.h1>

              <motion.p
                className="mb-8 rounded-lg bg-blue-50 p-4 text-left text-sm text-gray-700 border border-blue-200"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.5 }}>
                <span className="font-semibold text-blue-900">No worries!</span>{" "}
                Enter your email address and we'll send you a link to reset your
                password if your email is registered.
              </motion.p>

              <form onSubmit={handleSubmit} className="space-y-6">
                <AnimatedFormField
                  id="email"
                  label="Email Address"
                  type="email"
                  value={formData.email}
                  onChange={(value) => updateField("email", value)}
                  error={errors.email}
                  placeholder="Enter your email address"
                  required
                  delay={0.5}
                />

                <AnimatePresence>
                  {errors.general && (
                    <motion.div
                      className="text-center text-sm text-red-600 mb-4 flex items-center justify-center space-x-2 rounded-lg border border-red-200 bg-red-50 p-2"
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.3 }}>
                      {errors.general}
                    </motion.div>
                  )}
                </AnimatePresence>

                <AnimatedLoadingButton
                  type="submit"
                  isLoading={isSubmitting}
                  loadingText="Sending..."
                  className="w-full">
                  Send Reset Link
                </AnimatedLoadingButton>
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
                Check Your Email
              </motion.h1>

              <motion.p
                className="mb-8 text-gray-600 "
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.5 }}>
                {successMessage ||
                  `We've sent a password reset link to ${formData.email}. Please check your email and follow the instructions to reset your password.`}
              </motion.p>

              <motion.div
                className="space-y-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.5 }}>
                <p className="text-sm text-gray-500 rounded-lg bg-blue-50 p-4 text-left text-sm text-gray-700 border border-blue-200">
                  Didn't receive the email? Check your spam folder or{" "}
                  <button
                    onClick={handleTryAgain}
                    className="transition-all duration-200 hover:underline"
                    style={{ color: "#165598" }}>
                    try again
                  </button>
                </p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          className="mt-8 border-t border-gray-200 pt-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7, duration: 0.5 }}>
          <p className="text-sm text-gray-500">
            Remember your password?{" "}
            <Link
              href="/login"
              className="font-medium transition-all duration-200 hover:underline"
              style={{ color: "#165598" }}>
              Back to Login
            </Link>
          </p>
        </motion.div>
      </div>
    </AnimatedAuthCard>
  )
}
