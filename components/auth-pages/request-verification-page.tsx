"use client"

import type React from "react"
import { useEffect, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { AnimatePresence, motion } from "framer-motion"
import { CheckCircle, Mail } from "lucide-react"

import { authClient } from "@/lib/auth-client"
import { EmailFormData, emailSchema } from "@/lib/validators/auth-validators"
import { AnimatedAuthCard } from "@/components/auth/animated-auth-card"
import { AnimatedFormField } from "@/components/auth/animated-form-field"
import { AnimatedLoadingButton } from "@/components/auth/animated-loading-button"

import { Badge } from "../ui/badge"

export default function RequestVerificationPage() {
  const searchParams = useSearchParams()
  const emailParam = searchParams.get("email")

  const [formData, setFormData] = useState<EmailFormData>({
    email: emailParam || "",
  })

  const [errors, setErrors] = useState<
    Partial<EmailFormData> & {
      code?: string
      general?: string
    }
  >({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")

  const updateField = (field: keyof EmailFormData, value: string) => {
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

  const handleRequestVerification = async () => {
    const result = emailSchema.safeParse({ email: formData.email })
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors
      const newErrors: Partial<EmailFormData> & {
        acceptTerms?: string
        code?: string
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

    setIsSubmitting(true)
    try {
      const { data, error } = await authClient.sendVerificationEmail({
        email: formData.email,
        callbackURL: "/dashboard",
      })

      if (error) {
        setErrors({
          general: error.message || "Failed to send verification email",
        })
        return false
      }

      setSuccessMessage("Verification email sent successfully")
      return true
    } catch (error: any) {
      console.error("Request verification error:", error)
      setErrors({ general: "Failed to send verification email" })
      return false
    } finally {
      setIsSubmitting(false)
    }
  }

  const [isSubmitted, setIsSubmitted] = useState(false)

  useEffect(() => {
    if (successMessage) {
      setIsSubmitted(true)
    }
  }, [successMessage])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const success = await handleRequestVerification()
    if (success) {
      setIsSubmitted(true)
    }
  }

  const handleTryAgain = () => {
    setIsSubmitted(false)
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
                className="mx-auto mb-6 flex size-12 items-center justify-center rounded-full"
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
                Verify Your Email
              </motion.h1>

              <Badge
                variant={"info"}
                className="mb-4 whitespace-normal  py-2 text-sm">
                Your account needs to be verified before you can log in. Enter
                your email address to receive a new verification link.
              </Badge>

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
                      className="text-center text-sm text-red-600 flex items-center justify-center space-x-2 rounded-lg border border-red-200 bg-red-50 p-2"
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
                  className="w-full"
                  disabled={isSubmitting || !formData.email}>
                  Send Verification Email
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
                Verification Email Sent
              </motion.h1>

              <motion.p
                className="mb-8 rounded-lg bg-blue-50 p-4 text-left text-sm text-primary border border-blue-200"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.5 }}>
                {successMessage ||
                  `We've sent a verification link to ${formData.email}. Please check your email and click the link to verify your account.`}
              </motion.p>

              <motion.div
                className="space-y-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.5 }}>
                <p className="text-sm text-gray-500">
                  Didn&apos;t receive the email? Check your spam folder or{" "}
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
            Need help?{" "}
            <Link
              href="/contact"
              className="font-medium transition-all duration-200 hover:underline"
              style={{ color: "#165598" }}>
              Contact our support team
            </Link>
          </p>
        </motion.div>
      </div>
    </AnimatedAuthCard>
  )
}
