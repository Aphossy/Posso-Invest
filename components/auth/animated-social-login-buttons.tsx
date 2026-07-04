"use client"

import { useEffect, useState } from "react"
import {
  getDefaultRedirect,
  getRoleDashboard,
  roleRoutes,
} from "@/utils/role-utils"
import { motion } from "framer-motion"
import { BadgeCheck } from "lucide-react"
import { toast } from "sonner"

import { authClient } from "@/lib/auth-client"

import { Loader } from "../common/loader"
import { Button } from "../ui/button"

interface AnimatedSocialButtonsProps {
  className?: string
  redirectTo?: string
}

// Get safe redirect URL
function getSafeRedirectUrl(
  from: string | undefined,
  userRole: string
): string {
  if (!from) {
    return getDefaultRedirect(userRole)
  }

  const decodedFrom = decodeURIComponent(from)

  // Security: Only allow relative URLs
  if (
    decodedFrom.startsWith("http://") ||
    decodedFrom.startsWith("https://") ||
    decodedFrom.startsWith("//")
  ) {
    return getDefaultRedirect(userRole)
  }

  const safePath = decodedFrom.startsWith("/") ? decodedFrom : `/${decodedFrom}`

  // Check role access
  const allowedPrefixes = roleRoutes[userRole] || []
  const hasAccess = allowedPrefixes.some((prefix) =>
    safePath.startsWith(prefix)
  )

  if (!hasAccess) {
    return getRoleDashboard(userRole)
  }

  return safePath
}

export function AnimatedSocialButtons({
  className = "",
  redirectTo,
}: AnimatedSocialButtonsProps) {
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [isAppleLoading, setIsAppleLoading] = useState(false)
  const [lastMethod, setLastMethod] = useState<string | null>(null)
  const { data: session } = authClient.useSession()

  // Get/set last login method from cookie
  useEffect(() => {
    const cookieName = "better-auth.last_used_login_method"
    const value = `; ${document.cookie}`
    const parts = value.split(`; ${cookieName}=`)
    if (parts.length === 2) {
      const cookieValue = parts.pop()?.split(";").shift()
      setLastMethod(cookieValue || null)
    }
  }, [])

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true)

    try {
      // Build the callback URL with the redirect parameter
      let callbackURL = "/login"
      if (redirectTo) {
        callbackURL += `?from=${encodeURIComponent(redirectTo)}`
      }

      await authClient.signIn.social({
        provider: "google",
        callbackURL,
        newUserCallbackURL: "/login",
        errorCallbackURL: callbackURL,
        disableRedirect: false,
      })
    } catch (error: any) {
      console.error("Social sign-in error:", error)
      const errorMap: Record<string, string> = {
        invalid_code: "Invalid authorization code. Please try again.",
        state_mismatch: "Session expired. Please start over.",
        default: "Google sign-in failed. Please try again.",
      }
      const message = errorMap[error.message] || errorMap.default
      toast.error(message)
    } finally {
      setIsGoogleLoading(false)
    }
  }

  const handleAppleSignIn = async () => {
    setIsAppleLoading(true)

    try {
      // Set last-used cookie
      document.cookie =
        "better-auth.last_used_login_method=apple; path=/; max-age=31536000"
      setLastMethod("apple")

      let callbackURL = "/login"
      if (redirectTo) {
        callbackURL += `?from=${encodeURIComponent(redirectTo)}`
      }

      await authClient.signIn.social({
        provider: "apple",
        callbackURL,
        newUserCallbackURL: "/login",
        errorCallbackURL: callbackURL,
        disableRedirect: false,
      })
    } catch (error: any) {
      console.error("Apple sign-in error:", error)
      const errorMap: Record<string, string> = {
        invalid_request: "Invalid request. Please try again.",
        default: "Apple sign-in failed. Please try again.",
      }
      const message = errorMap[error.message] || errorMap.default
      toast.error(message)
    } finally {
      setIsAppleLoading(false)
    }
  }

  const isGooglePreferred = lastMethod === "google"
  const isApplePreferred = lastMethod === "apple"

  const badge = (
    <motion.div
      className="absolute -top-2 -right-2 flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-white shadow-lg z-10"
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 0.2, type: "spring", stiffness: 400 }}>
      <BadgeCheck className="h-3 w-3" />
      <span className="inline">Last used</span>
    </motion.div>
  )

  return (
    <motion.div
      className={`w-full ${className}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.5 }}>
      {/* Divider */}
      <motion.div
        className="relative mb-6"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.5, delay: 0.6 }}>
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300" />
        </div>
        <div className="relative flex justify-center text-sm">
          <motion.span
            className="bg-white px-4 text-gray-600 font-medium"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}>
            Or continue with
          </motion.span>
        </div>
      </motion.div>

      {/* Responsive Grid */}
      <motion.div
        className="grid gap-3"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}>
        {/* Google Button */}
        <motion.div
          className="relative"
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          transition={{ type: "spring", stiffness: 400, damping: 17 }}>
          <Button
            type="button"
            variant="outline"
            className={`w-full transition-all duration-200 ${
              isGooglePreferred
                ? "bg-blue-50 border-blue-200 hover:bg-blue-100 hover:border-blue-300"
                : "bg-white hover:bg-gray-50 border-gray-300 hover:border-gray-400"
            }`}
            onClick={handleGoogleSignIn}
            disabled={isGoogleLoading || isAppleLoading}>
            {isGoogleLoading ? (
              <div className="flex items-center justify-center gap-2">
                <Loader className="h-4 w-4" />
                <span className="hidden sm:inline">Connecting...</span>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2.5">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 256 262"
                  className="flex-shrink-0">
                  <path
                    fill="#4285f4"
                    d="M255.878 133.451c0-10.734-.871-18.567-2.756-26.69H130.55v48.448h71.947c-1.45 12.04-9.283 30.172-26.69 42.356l-.244 1.622l38.755 30.023l2.685.268c24.659-22.774 38.875-56.282 38.875-96.027"
                  />
                  <path
                    fill="#34a853"
                    d="M130.55 261.1c35.248 0 64.839-11.605 86.453-31.622l-41.196-31.913c-11.024 7.688-25.82 13.055-45.257 13.055c-34.523 0-63.824-22.773-74.269-54.25l-1.531.13l-40.298 31.187l-.527 1.465C35.393 231.798 79.49 261.1 130.55 261.1"
                  />
                  <path
                    fill="#fbbc05"
                    d="M56.281 156.37c-2.756-8.123-4.351-16.827-4.351-25.82c0-8.994 1.595-17.697 4.206-25.82l-.073-1.73L15.26 71.312l-1.335.635C5.077 89.644 0 109.517 0 130.55s5.077 40.905 13.925 58.602z"
                  />
                  <path
                    fill="#eb4335"
                    d="M130.55 50.479c24.514 0 41.05 10.589 50.479 19.438l36.844-35.974C195.245 12.91 165.798 0 130.55 0C79.49 0 35.393 29.301 13.925 71.947l42.211 32.783c10.59-31.477 39.891-54.251 74.414-54.251"
                  />
                </svg>
                <span className="font-medium">Login with Google</span>
              </div>
            )}
          </Button>
          {isGooglePreferred && !isGoogleLoading && badge}
        </motion.div>
      </motion.div>
    </motion.div>
  )
}
