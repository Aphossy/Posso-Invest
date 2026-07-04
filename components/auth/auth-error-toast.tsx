"use client"

import { useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"

type ErrorConfig = {
  title: string
  description: string
  action?: {
    label: string
    href: string
  }
}

const AUTH_ERROR_MAP: Record<string, ErrorConfig> = {
  please_restart_the_process: {
    title: "Sign-in session expired",
    description:
      "Your sign-in session timed out or was interrupted. Please start the process again.",
    action: { label: "Sign in again", href: "/login" },
  },
  invalid_code: {
    title: "Invalid authorization code",
    description:
      "This sign-in link has already been used or has expired. Please request a new one.",
    action: { label: "Try again", href: "/login" },
  },
  state_mismatch: {
    title: "Security check failed",
    description:
      "We couldn't verify your sign-in request — this can happen when you switch tabs or use the back button. Please try again.",
    action: { label: "Sign in again", href: "/login" },
  },
  "google-login-failed-please-try-again": {
    title: "Google sign-in failed",
    description:
      "We couldn't complete your Google sign-in. This may be a temporary issue.",
    action: { label: "Try Google again", href: "/login" },
  },
  email_not_verified: {
    title: "Email not verified",
    description:
      "You need to verify your email address before you can sign in.",
    action: {
      label: "Resend verification email",
      href: "/request-verification",
    },
  },
  banned: {
    title: "Account suspended",
    description:
      "Your account has been suspended. If you think this is a mistake, contact our support team.",
    action: { label: "Contact support", href: "/contact" },
  },
  token_expired: {
    title: "Link expired",
    description:
      "This link has expired. Please request a fresh one and try again.",
    action: { label: "Request new link", href: "/login" },
  },
  invalid_token: {
    title: "Invalid or used link",
    description:
      "This link is invalid or has already been used. Please go back to sign in.",
    action: { label: "Back to sign in", href: "/login" },
  },
  too_many_requests: {
    title: "Too many attempts",
    description:
      "You've made too many requests in a short time. Please wait a moment, then try again.",
    action: { label: "Go to sign in", href: "/login" },
  },
  account_not_found: {
    title: "Account not found",
    description:
      "No account is linked to this sign-in method. Try a different method or create a new account.",
    action: { label: "Create an account", href: "/register" },
  },
  oauth_account_not_linked: {
    title: "Account not linked",
    description:
      "This sign-in method is not linked to any account. Sign in with the method you used to register, then link it in your settings.",
    action: { label: "Sign in", href: "/login" },
  },
}

const FALLBACK_ERROR: ErrorConfig = {
  title: "Sign-in failed",
  description:
    "Something went wrong during sign-in. Please try again or contact support if the problem persists.",
  action: { label: "Try again", href: "/login" },
}

export function AuthErrorToast() {
  const searchParams = useSearchParams()
  const router = useRouter()

  useEffect(() => {
    const raw = searchParams.get("error")
    if (!raw) return

    const code = decodeURIComponent(raw)
    const config = AUTH_ERROR_MAP[code] ?? FALLBACK_ERROR

    toast.error(config.title, {
      description: config.description,
      duration: 8000,
      ...(config.action && {
        action: {
          label: config.action.label,
          onClick: () => router.push(config.action!.href as any),
        },
      }),
    })

    // Clean the error param from the URL without a full navigation
    const params = new URLSearchParams(searchParams.toString())
    params.delete("error")
    const clean =
      params.size > 0 ? `?${params.toString()}` : window.location.pathname
    window.history.replaceState(null, "", clean)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return null
}
