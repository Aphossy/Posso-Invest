// ccomponents\auth-pages\login-form.tsx
"use client"

import type React from "react"
import { useEffect, useRef, useState } from "react"
import type { Route } from "next"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { AnimatePresence, motion } from "framer-motion"
import { AlertCircle, Video } from "lucide-react"
import { toast } from "sonner"
import * as z from "zod"

import { messageVariants, staggerContainer } from "@/lib/animations"
import { sendLoginNotification, updateLastLogin } from "@/lib/auth-actions"
import { authClient, isOneTapEnabled } from "@/lib/auth-client"
import { useMediaQuery } from "@/hooks/use-media-query"
import { useOAuthLoginTracker } from "@/hooks/use-oauth-login-tracker"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer"
import { Label } from "@/components/ui/label"
import { AnimatedFormField } from "@/components/auth/animated-form-field"
import { AnimatedLoadingButton } from "@/components/auth/animated-loading-button"
import { AnimatedOTPInput } from "@/components/auth/animated-otp-input"
import { AnimatedPasswordField } from "@/components/auth/animated-password-field"

import { AnimatedSocialButtons } from "../auth/animated-social-login-buttons"
import { Loader } from "../common/loader"

const TUTORIAL_URL = "https://youtu.be/Lrf3ECWCfDM"

const invitationSteps = [
  {
    title: "Check your invitation email",
    description:
      "You should have received an invitation link by email. If you don't see it in your inbox, check your Spam or Junk folder - it sometimes ends up there.",
  },
  {
    title: "Login with Google",
    description:
      'Use the same email address the invitation was sent to. Click "Login with Google" below to sign in.',
  },
  {
    title: "Accept the invitation",
    description:
      'After logging in, go back to your email and click the "Accept Invitation" link. You\'ll be granted access automatically.',
  },
]

function RequestAccessGuide({ onContinue }: { onContinue: () => void }) {
  return (
    <div className="space-y-5">
      <ol className="space-y-4">
        {invitationSteps.map((step, i) => (
          <li key={i} className="flex gap-4">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm">
              {i + 1}
            </div>
            <div className="space-y-0.5">
              <p className="font-semibold text-sm">{step.title}</p>
              <p className="text-sm text-muted-foreground">
                {step.description}
              </p>
            </div>
          </li>
        ))}
      </ol>

      <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 flex items-start gap-3">
        <Video className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <div className="space-y-1">
          <p className="text-sm font-medium">Need a visual walkthrough?</p>
          <a
            href={TUTORIAL_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary underline underline-offset-4 hover:text-primary/80">
            Watch the tutorial video →
          </a>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Button variant="secondary" className="w-full" onClick={onContinue}>
          I don't have an invitation - request access
        </Button>
      </div>
    </div>
  )
}

const loginSchema = z.object({
  email: z.string().email("Email is invalid"),
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean().optional(),
})

export type AuthFormData = z.infer<typeof loginSchema>

interface LoginPageComponentProps {
  error?: string
}

export default function LoginPageComponent({ error }: LoginPageComponentProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectFrom = searchParams.get("from")
  const isDesktop = useMediaQuery("(min-width: 768px)")
  const [guideOpen, setGuideOpen] = useState(false)

  // Track OAuth logins and update last login
  useOAuthLoginTracker()

  useEffect(() => {
    if (error) {
      toast.error(error)
      window.history.replaceState(
        {},
        "",
        window.location.pathname + (redirectFrom ? `?from=${redirectFrom}` : "")
      )
    }
  }, [error, redirectFrom])

  const [formData, setFormData] = useState<AuthFormData>({
    email: "",
    password: "",
    rememberMe: false,
  })

  const [errors, setErrors] = useState<
    Partial<AuthFormData> & {
      code?: string
      general?: string
    }
  >({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [twoFactorRequired, setTwoFactorRequired] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")
  const [otpCode, setOtpCode] = useState(Array(6).fill(""))
  const [isResending, setIsResending] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [isRedirecting, setIsRedirecting] = useState(false)
  const hasRequestedOneTap = useRef(false)

  const { data: session } = authClient.useSession()

  useEffect(() => {
    if (!isOneTapEnabled || twoFactorRequired || session?.user) return
    if (hasRequestedOneTap.current) return

    hasRequestedOneTap.current = true
    const redirectUrl = redirectFrom
      ? `/redirect?from=${encodeURIComponent(redirectFrom)}`
      : "/redirect"

    void authClient
      .oneTap({
        callbackURL: redirectUrl,
      })
      .catch((oneTapError) => {
        // AbortError is expected when FedCM prompt is dismissed or navigated away
        if (oneTapError?.name !== "AbortError") {
          console.error("Google One Tap initialization failed:", oneTapError)
        }
      })
  }, [redirectFrom, session?.user, twoFactorRequired])

  // Cooldown timer for resend
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(
        () => setResendCooldown(resendCooldown - 1),
        1000
      )
      return () => clearTimeout(timer)
    }
  }, [resendCooldown])

  useEffect(() => {
    if (!session?.user || isRedirecting) return
    setIsRedirecting(true)
    const redirectUrl = redirectFrom
      ? `/redirect?from=${encodeURIComponent(redirectFrom)}`
      : "/redirect"
    void router.replace(redirectUrl as Route)
  }, [session?.user, redirectFrom, isRedirecting, router])

  if (session?.user && isRedirecting) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="flex items-center gap-3 rounded-xl border border-border bg-background px-5 py-4 shadow-sm">
          <Loader className="h-5 w-5" />
          <div className="text-sm font-medium text-foreground">
            Signing you in…
          </div>
        </div>
      </div>
    )
  }

  const updateField = (field: keyof AuthFormData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }))
    }
    if (errors.general) {
      setErrors((prev) => ({ ...prev, general: undefined }))
    }
    if (successMessage) {
      setSuccessMessage("")
    }
  }

  const validateForm = () => {
    const schema = loginSchema
    const result = schema.safeParse(formData)

    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors
      const newErrors: Partial<AuthFormData> & {
        code?: string
        general?: string
      } = {}

      for (const [field, messages] of Object.entries(fieldErrors)) {
        newErrors[field as "email" | "password"] = messages[0]
      }

      setErrors(newErrors)
      return false
    }

    setErrors({})
    return true
  }

  const handleLogin = async () => {
    if (!validateForm()) return false

    setIsSubmitting(true)

    try {
      const { error } = await authClient.signIn.email(
        {
          email: formData.email,
          password: formData.password,
          rememberMe: formData.rememberMe,
        },
        {
          onRequest: () => {
            // Loading state is already handled
          },
          onSuccess: async (ctx) => {
            if (ctx.data?.twoFactorRedirect) {
              setTwoFactorRequired(true)

              // Manually send OTP when 2FA is required
              try {
                const { error: otpError } = await authClient.twoFactor.sendOtp(
                  {}
                )

                if (otpError) {
                  console.error("Failed to send OTP:", otpError)
                  toast.error(
                    "Failed to send verification code. Please try again."
                  )
                  setTwoFactorRequired(false)
                  return
                }

                setResendCooldown(30) // Start cooldown after OTP is sent
                toast.success("Verification code sent to your email!")
              } catch (error) {
                console.error("Error sending OTP:", error)
                toast.error(
                  "Failed to send verification code. Please try again."
                )
                setTwoFactorRequired(false)
              }

              return
            }

            setSuccessMessage("Signed in successfully! Redirecting...")

            // Update last login timestamp
            try {
              await updateLastLogin()
              // Send login notification email
              await sendLoginNotification()
            } catch (error) {
              console.error("Failed to update last login:", error)
              // Don't fail login if this fails
            }

            const redirectUrl = redirectFrom
              ? `/redirect?from=${encodeURIComponent(redirectFrom)}`
              : "/redirect"
            void router.push(redirectUrl as Route)
          },
          onError: (ctx) => {
            const errorMessage = ctx.error.message || "Login failed"

            if (
              errorMessage.toLowerCase().includes("email") &&
              errorMessage.toLowerCase().includes("verified")
            ) {
              router.push(
                `/request-verification?email=${encodeURIComponent(formData.email)}` as Route
              )
            } else if (errorMessage.toLowerCase().includes("credentials")) {
              setErrors({ general: "Invalid email or password" })
            } else {
              setErrors({ general: errorMessage })
            }
          },
        }
      )

      if (error) {
        return false
      }

      return true
    } catch (error: any) {
      console.error("Login error:", error)
      setErrors({ general: "An unexpected error occurred. Please try again." })
      return false
    } finally {
      setIsSubmitting(false)
    }
  }

  const verify2FA = async (code: string) => {
    setIsSubmitting(true)
    setErrors((prev) => ({ ...prev, code: undefined }))

    try {
      const { data, error } = await authClient.twoFactor.verifyOtp({
        code,
        // trustDevice: formData.rememberMe,
        trustDevice: false,
      })

      if (error) {
        setErrors({
          code: error.message || "Invalid verification code. Please try again.",
        })
        setIsSubmitting(false)
        // Clear the code so user can try again
        setOtpCode(Array(6).fill(""))
        return false
      }

      // Verification successful
      setSuccessMessage("Verified successfully!")

      // Update last login timestamp
      try {
        await updateLastLogin()
        // Send login notification email
        await sendLoginNotification()
      } catch (error) {
        console.error("Failed to update last login:", error)
        // Don't fail login if this fails
      }

      const redirectUrl = redirectFrom
        ? `/redirect?from=${encodeURIComponent(redirectFrom)}`
        : "/redirect"

      // Small delay to show success message
      setTimeout(() => {
        void router.push(redirectUrl as Route)
      }, 500)

      return true
    } catch (error: any) {
      console.error("2FA verification error:", error)
      setErrors({ code: "Verification failed. Please try again." })
      setIsSubmitting(false)
      // Clear the code so user can try again
      setOtpCode(Array(6).fill(""))
      return false
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (twoFactorRequired) {
      const code = otpCode.join("")
      if (code.length === 6 && !isSubmitting) {
        await verify2FA(code)
      }
      return
    }

    await handleLogin()
  }

  const handleOtpChange = async (otp: string[]) => {
    setOtpCode(otp)

    // Clear any previous errors when user types
    if (errors.code) {
      setErrors((prev) => ({ ...prev, code: undefined }))
    }

    // Auto-verify when all 6 digits are entered
    const code = otp.join("")
    if (code.length === 6 && !isSubmitting) {
      await verify2FA(code)
    }
  }

  const handleResendCode = async () => {
    if (resendCooldown > 0) return

    setIsResending(true)
    setErrors((prev) => ({ ...prev, code: undefined }))
    setOtpCode(Array(6).fill("")) // Clear previous code

    try {
      const { error } = await authClient.twoFactor.sendOtp({})

      if (error) {
        toast.error("Failed to resend code. Please try again.")
        setIsResending(false)
        return
      }

      toast.success("Verification code sent! Check your email.")
      setResendCooldown(30) // 30 seconds cooldown
    } catch (error: any) {
      console.error("Resend OTP error:", error)
      toast.error("Failed to resend code. Please try again.")
    } finally {
      setIsResending(false)
    }
  }

  const handleBackToLogin = () => {
    setTwoFactorRequired(false)
    setOtpCode(Array(6).fill(""))
    setResendCooldown(0)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="w-full max-w-md">
      <Card className="border-border shadow-lg">
        <CardHeader className="space-y-1">
          <CardTitle className="text-3xl font-bold">
            <motion.h1
              className="mt-2 mb-0 text-2xl sm:text-3xl font-bold"
              style={{ color: "#007952" }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}>
              {twoFactorRequired ? "Enter Verification Code" : "Welcome Back!"}
            </motion.h1>
          </CardTitle>
          <CardDescription className="">
            Enter your credentials to access your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <motion.div
            className="flex flex-col justify-center "
            variants={staggerContainer}
            initial="initial"
            animate="animate">
            <div className="mx-auto w-full max-w-md pt-0">
              <form onSubmit={handleSubmit} className="space-y-6">
                <AnimatePresence mode="wait">
                  {!twoFactorRequired ? (
                    <motion.div
                      key="login-form"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="space-y-6">
                      <AnimatedFormField
                        id="email"
                        label="Email"
                        type="email"
                        value={formData.email}
                        onChange={(value) => updateField("email", value)}
                        error={errors.email}
                        placeholder="Enter your email"
                        delay={0.1}
                      />

                      <AnimatedPasswordField
                        id="password"
                        label="Password"
                        value={formData.password}
                        onChange={(value) => updateField("password", value)}
                        error={errors.password}
                        placeholder="Enter your password"
                        delay={0.2}
                      />

                      <motion.div
                        className="flex items-center -mt-2 justify-between"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}>
                        <motion.div className="flex items-center space-x-2">
                          <Checkbox
                            id="remember"
                            checked={formData.rememberMe}
                            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                            onCheckedChange={(checked) =>
                              updateField("rememberMe", checked as boolean)
                            }
                          />
                          <Label
                            htmlFor="remember"
                            className="text-sm"
                            style={{ color: "#605D5E" }}>
                            Remember me
                          </Label>
                        </motion.div>
                        <motion.div>
                          <Link
                            href="/forgot-password"
                            className="text-sm font-medium hover:underline"
                            style={{ color: "#007952" }}>
                            Forgot password?
                          </Link>
                        </motion.div>
                      </motion.div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="2fa-form"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="space-y-6">
                      <motion.div
                        className="mb-6 text-center space-y-2"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}>
                        <p className="text-gray-600">
                          We&apos;ve sent a 6-digit verification code to
                        </p>
                        <p className="text-sm text-gray-700 font-medium">
                          <span className="text-primary">
                            {formData.email}, If you didn&apos;t receive it,
                            please check your spam folder.
                          </span>
                        </p>
                        <p className="text-xs text-gray-500">
                          The code will expire in 10 minutes
                        </p>
                      </motion.div>

                      <AnimatedOTPInput
                        value={otpCode}
                        onChange={handleOtpChange}
                        error={errors.code}
                      />

                      <motion.div
                        className="flex items-center justify-between"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}>
                        <motion.button
                          type="button"
                          onClick={handleBackToLogin}
                          className="text-sm text-gray-500 hover:underline"
                          whileHover={{ x: -2 }}
                          transition={{ duration: 0.2 }}>
                          ← Back to login
                        </motion.button>

                        <motion.button
                          type="button"
                          onClick={handleResendCode}
                          disabled={resendCooldown > 0 || isResending}
                          className={`text-sm font-medium ${
                            resendCooldown > 0 || isResending
                              ? "text-gray-400 cursor-not-allowed"
                              : "text-primary hover:underline"
                          }`}
                          whileHover={resendCooldown === 0 ? { x: 2 } : {}}
                          transition={{ duration: 0.2 }}>
                          {isResending
                            ? "Sending..."
                            : resendCooldown > 0
                              ? `Resend in ${resendCooldown}s`
                              : "Resend Code"}
                        </motion.button>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}>
                  <AnimatedLoadingButton
                    type="submit"
                    loadingText={
                      twoFactorRequired ? "Verifying..." : "Signing in..."
                    }
                    isLoading={isSubmitting}>
                    {isSubmitting
                      ? twoFactorRequired
                        ? "Verifying..."
                        : "Signing in..."
                      : twoFactorRequired
                        ? "Verify Code"
                        : "Login"}
                  </AnimatedLoadingButton>
                </motion.div>

                <AnimatePresence mode="wait">
                  {successMessage && (
                    <motion.div
                      className="mb-4  flex justify-center items-center space-x-2 rounded-lg border border-blue-200 bg-blue-50 p-3"
                      variants={messageVariants}
                      initial="initial"
                      animate="animate"
                      exit="exit">
                      <span className="text-sm text-primary/80">
                        {successMessage}
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {errors.general && (
                  <motion.div
                    className="mb-4 flex justify-center items-center space-x-2 rounded-lg border border-red-200 bg-red-50 p-2 "
                    variants={messageVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit">
                    <AlertCircle className="size-4 text-red-600" />
                    <span className="text-sm  text-red-700">
                      {errors.general}
                    </span>
                  </motion.div>
                )}
              </form>
              {!twoFactorRequired && (
                <AnimatedSocialButtons
                  className="pt-4"
                  redirectTo={redirectFrom || undefined}
                />
              )}
            </div>
          </motion.div>

          <div className="mt-6 flex flex-col gap-4 text-center text-sm text-muted-foreground">
            <div>
              Don&apos;t have access?{" "}
              <button
                type="button"
                onClick={() => setGuideOpen(true)}
                className="font-medium text-primary hover:text-primary/90 hover:underline underline-offset-4">
                Request Access
              </button>
            </div>
            <Link
              href="/"
              className="font-medium pt-0 md:hidden text-primary hover:text-primary/90 underline hover:no-underline underline-offset-4">
              Back to Home
            </Link>
          </div>

          {/* Request Access Guide */}
          {isDesktop ? (
            <Dialog open={guideOpen} onOpenChange={setGuideOpen}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>How to get access</DialogTitle>
                  <DialogDescription>
                    Access is by invitation only. Follow the steps below to
                    join.
                  </DialogDescription>
                </DialogHeader>
                <RequestAccessGuide
                  onContinue={() => {
                    setGuideOpen(false)
                    router.push("/contact?service=request-access" as Route)
                  }}
                />
              </DialogContent>
            </Dialog>
          ) : (
            <Drawer open={guideOpen} onOpenChange={setGuideOpen}>
              <DrawerContent className="max-h-[92vh]">
                <DrawerHeader className="text-left">
                  <DrawerTitle>How to get access</DrawerTitle>
                  <DrawerDescription>
                    Access is by invitation only. Follow the steps below to
                    join.
                  </DrawerDescription>
                </DrawerHeader>
                <div className="overflow-y-auto px-4 pb-6">
                  <RequestAccessGuide
                    onContinue={() => {
                      setGuideOpen(false)
                      router.push("/contact?service=request-access" as Route)
                    }}
                  />
                </div>
              </DrawerContent>
            </Drawer>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
