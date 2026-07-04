"use client"

import type React from "react"
import { useEffect, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { AnimatePresence, motion } from "framer-motion"
import { CheckCircle, Mail, XCircle } from "lucide-react"

import { authClient } from "@/lib/auth-client"
import { EmailFormData, emailSchema } from "@/lib/validators/auth-validators"
import { AnimatedAuthCard } from "@/components/auth/animated-auth-card"
import { AnimatedFormField } from "@/components/auth/animated-form-field"
import { AnimatedLoadingButton } from "@/components/auth/animated-loading-button"

import { Loader } from "../common/loader"

interface VerificationResponse {
  error: any
  success: boolean
  message: string
  user?: {
    email: string
    firstName: string
    isVerified: boolean
  }
}

export default function VerifyAccountPage() {
  const [userEmail, setUserEmail] = useState("")

  const searchParams = useSearchParams()
  const token = searchParams.get("token")
  const [verificationStatus, setVerificationStatus] = useState<
    "loading" | "success" | "error"
  >("loading")
  const [message, setMessage] = useState("")

  const [formData, setFormData] = useState<EmailFormData>({
    email: userEmail || "",
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
      const { error } = await authClient.verifyEmail({
        query: {
          token: token || "",
        },
        fetchOptions: {
          method: "POST",
        },
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

  useEffect(() => {
    if (!token) {
      setVerificationStatus("error")
      setMessage("No verification token provided")
      return
    }

    verifyToken(token)
  }, [token])

  const verifyToken = async (verificationToken: string) => {
    try {
      const response = await fetch(
        `/api/auth/verify?token=${verificationToken}`
      )
      const data: VerificationResponse = await response.json()

      if (response.ok && data.success) {
        setVerificationStatus("success")
        setMessage(data.message)
        if (data.user) {
          setUserEmail(data.user.email)
        }
      } else {
        setVerificationStatus("error")
        setMessage(data.error.message || "Verification failed")
      }
    } catch (error) {
      console.error("Verification error:", error)
      setVerificationStatus("error")
      setMessage("An error occurred during verification")
    }
  }

  const handleResendVerification = async (e: React.FormEvent) => {
    e.preventDefault()
    await handleRequestVerification()
  }

  return (
    <AnimatedAuthCard className="w-full max-w-md">
      <div className="mx-auto w-full max-w-md p-8 text-center md:min-w-md">
        <AnimatePresence mode="wait">
          {verificationStatus === "loading" && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}>
              <motion.div
                className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full"
                style={{ backgroundColor: "#165598" }}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}>
                <Loader className="h-6 w-6 text-gray-100" />
              </motion.div>

              <motion.h1
                className="mb-4 text-3xl font-bold"
                style={{ color: "#165598" }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }}>
                Verifying Your Account
              </motion.h1>

              <motion.p
                className="mb-8 text-gray-600"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.5 }}>
                Please wait while we verify your account. This may take a few
                moments.
              </motion.p>
            </motion.div>
          )}

          {verificationStatus === "success" && (
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
                Account Verified Successfully!
              </motion.h1>

              <motion.p
                className="mb-8 text-gray-600"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.5 }}>
                {message ||
                  "Congratulations! Your TrustLink Group account has been successfully verified. You can now access all features and start your auction journey."}
              </motion.p>

              <motion.div
                className="space-y-4"
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

          {verificationStatus === "error" && (
            <motion.div
              key="error"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.5 }}>
              <motion.div
                className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-100"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}>
                <XCircle className="h-8 w-8 text-red-600" />
              </motion.div>

              <motion.h1
                className="mb-4 text-3xl font-bold"
                style={{ color: "#165598" }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }}>
                Verification Failed
              </motion.h1>

              <motion.p
                className="mb-8 text-gray-600"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.5 }}>
                {message ||
                  "We couldn't verify your account. The verification link may be invalid or expired."}
              </motion.p>

              <motion.div
                className="space-y-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.5 }}>
                <form onSubmit={handleResendVerification} className="space-y-3">
                  <AnimatedFormField
                    id="email"
                    label="Email"
                    type="email"
                    value={formData.email}
                    onChange={(value) => updateField("email", value)}
                    error={errors.email}
                    placeholder="Enter your email address"
                    required
                    delay={0.6}
                  />

                  <AnimatedLoadingButton
                    type="submit"
                    isLoading={isSubmitting}
                    disabled={isSubmitting}
                    className="w-full"
                    loadingText="Sending...">
                    <Mail className="mr-2 h-4 w-4" />
                    Resend Verification Email
                  </AnimatedLoadingButton>
                </form>

                <AnimatePresence>
                  {(successMessage || errors.general) && (
                    <motion.p
                      className={`text-sm ${successMessage ? "text-green-600" : "text-red-600"}`}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.3 }}>
                      {successMessage || errors.general}
                    </motion.p>
                  )}
                </AnimatePresence>

                <Link href="/contact">
                  <motion.button
                    className="w-full rounded-full border-2 bg-transparent py-1 font-medium transition-colors hover:bg-gray-50"
                    style={{ borderColor: "#165598", color: "#165598" }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8, duration: 0.5 }}>
                    Contact Support
                  </motion.button>
                </Link>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          className="mt-8 border-t border-gray-200 pt-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9, duration: 0.5 }}>
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
